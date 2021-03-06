# -*- coding: utf-8 -*-

import datetime
import urllib

from tornado.escape import json_encode, json_decode, url_escape
from tornado import gen
from tornado.httpclient import AsyncHTTPClient
from models.user import UserModel
from models.user_hotel_mapping import UserHotelMappingModel

from views.base import BtwBaseHandler
from tasks.order import cancel_order_in_queue as Cancel
from models.order import OrderModel
from models.merchant import MerchantModel
from models.rate_plan import RatePlanModel
from models.cooperate_roomtype import CooperateRoomTypeModel
from models.order_history import OrderHistoryModel
from models.inventory import InventoryModel
from models.order_history import OrderHistoryModel

from exception.json_exception import JsonException
from exception.celery_exception import CeleryException
from tools.log import Log

from entity.order import SubmitOrder
from tasks.order.submit_order_in_queue import start_order
from tasks.sms import send_order_sms
from config import API

import tcelery
tcelery.setup_nonblocking_producer()


class SubmitOrderAPIHandler(BtwBaseHandler):
    '''
    this api is use for server to submit order
    '''

    @gen.coroutine
    def post(self):
        Log.info("submit order: {}".format(self.request.body))

        order_entity = self.format_order(self.request.body)
        order = yield self.submit_order(order_entity)
        merchant = MerchantModel.get_by_id(self.db, order.merchant_id)

        if order.status in [200, 400, 500]:
            self.finish_json(errcode=1,
                             errmsg="fail: {}".format(order.exception_info),
                             result=dict(order_id=order.id,
                                         merchant=merchant.todict(), ))
        else:
            yield self.call_weixin(order)
            self.finish_json(result=dict(order_id=order.id,
                                         btwOrderId=order.main_order_id,
                                         wait=0 if order.confirm_type ==
                                         OrderModel.CONFIRM_TYPE_AUTO or
                                         order.status == 300 else 1,
                                         merchant=merchant.todict(), ))

    @gen.coroutine
    def call_weixin(self, order):
        if order.confirm_type == OrderModel.CONFIRM_TYPE_AUTO:
            raise gen.Return()
        map_hotels = UserHotelMappingModel.get_hotel_by_id(self.db, merchant_id=order.merchant_id,
                                                          hotel_id=order.hotel_id)
        order_dict = order.todict()
        if map_hotels:
            user_ids = [map_hotel.user_id for map_hotel in map_hotels]
            users = UserModel.get_users_by_id(self.db, user_ids)
            usernames = [user.username for user in users]
            order_dict['usernames'] = ",".join(usernames)
        url = API['WEIXIN'] + "/webchart/ebkOrderPush"
        body = urllib.urlencode(order_dict)
        try:
            yield AsyncHTTPClient().fetch(url, method='POST', body=body)
        except Exception, e:
            Log.exception(e)

        raise gen.Return()





    def format_order(self, order_json):
        Log.info(order_json)
        try:
            order_entity = SubmitOrder(order_json)
        except ValueError as e:
            raise JsonException(errcode=1, errmsg=e.message)
        Log.info(order_entity)

        rate_plan = RatePlanModel.get_by_id(self.db, order_entity.rateplan_id)
        if not rate_plan:
            raise JsonException(1, 'no rate plan')

        order_entity.pay_type = rate_plan.pay_type
        order_entity.merchant_id = rate_plan.merchant_id
        order_entity.cancel_type = rate_plan.cancel_type
        order_entity.punish_type = rate_plan.punish_type
        order_entity.punish_value = rate_plan.punish_value
        order_entity.guarantee_type = rate_plan.guarantee_type
        order_entity.guarantee_start_time = rate_plan.guarantee_start_time

        return order_entity

    @gen.coroutine
    def submit_order(self, order_entity):
        order = self.pre_check_order(order_entity)

        if order.status == 0:
            # second valid in spec queue
            task = yield gen.Task(start_order.apply_async, args=[order.id])
            order = task.result
            if task.status == 'SUCCESS' and order:
                send_order_sms.delay(order.merchant_id, order.hotel_name,
                                     order.id, order.confirm_type)
            else:
                raise JsonException(
                    1,
                    'server error: there are something wrong when processing order in celery queue')

        raise gen.Return(order)

    def pre_check_order(self, order_entity):

        order = self.create_order(order_entity)
        if not order:
            raise JsonException(1, 'create order fail')

        if order.status != 0:
            return order

        # valid is roomtype online
        roomtype = CooperateRoomTypeModel.get_by_id(self.db, order.roomtype_id)
        if roomtype.is_online != 1:
            Log.info('roomtype is not online')
            order.status = 200
            order.exception_info = 'roomtype is not online'
            self.db.commit()
            OrderHistoryModel.set_order_status_by_server(self.db, order, 0, 200)
            return order

        # valid is inventory enough
        if not self.valid_inventory(order_entity):
            Log.info('more room please')
            order.status = 200
            order.exception_info = 'inventory not enough'
            self.db.commit()

            OrderHistoryModel.set_order_status_by_server(self.db, order, 0, 200)
            return order

        return order

    def create_order(self, order_entity):
        order = OrderModel.get_by_main_order_id(self.db, order_entity.id)
        if order:
            # callback 订单已存在
            Log.info('order exist')
            return order

        order = OrderModel.new_order(self.db, order_entity)
        return order

    def valid_inventory(self, order):
        Log.info('# valid inventory for order {}'.format(order.id))
        stay_days = self.get_stay_days(order.checkin_date, order.checkout_date)
        year_months = [(day.year, day.month) for day in stay_days]
        year_months = {}.fromkeys(year_months).keys()

        inventories = InventoryModel.get_by_merchant_hotel_roomtype_dates(
            self.db, order.merchant_id, order.hotel_id, order.roomtype_id,
            year_months)

        if not inventories:
            Log.info("no inventory")
            return False

        for inventory in inventories:
            Log.info(inventory.todict())

        for day in stay_days:
            inventory = None
            month = self.combin_year_month(day.year, day.month)
            Log.info('...finding {}'.format(month))

            for _inventory in inventories:
                if _inventory.month == month:
                    inventory = _inventory
                    break
            else:
                Log.info('day {} not found'.format(day))
                return False

            if inventory.get_day(day.day) < order.room_quantity:
                Log.info('room not enough in {}'.format(day))
                return False
        else:
            Log.info('found')
            return True

    def get_stay_days(self, start_date, end_date):
        date_format = "%Y-%m-%d"
        start_time = datetime.datetime.strptime(start_date, date_format)
        end_time = datetime.datetime.strptime(end_date, date_format)

        if start_time >= end_time:
            return start_time, start_time

        aday = datetime.timedelta(days=1)
        days = []
        while start_time < end_time:
            days.append(start_time)
            start_time = start_time + aday

        return days

    def combin_year_month(self, year, month):
        return int("{}{:0>2d}".format(year, month))



class ReSubmitOrderAPIHandler(SubmitOrderAPIHandler):

    @gen.coroutine
    def post(self):
        Log.info("resubmit order: {}".format(self.request.body))
        order_entity = self.format_order(self.request.body)
        self.reset_order_status(order_entity)


        order = yield self.submit_order(order_entity)
        merchant = MerchantModel.get_by_id(self.db, order.merchant_id)

        if order.status in [200, 400, 500]:
            self.finish_json(errcode=1,
                             errmsg="fail: {}".format(order.exception_info),
                             result=dict(order_id=order.id,
                                         btwOrderId=order.main_order_id,
                                         merchant=merchant.todict(), ))
        else:
            yield self.call_weixin(order)
            self.finish_json(result=dict(order_id=order.id,
                                         wait=0 if order.confirm_type ==
                                         OrderModel.CONFIRM_TYPE_AUTO or
                                         order.status == 300 else 1,
                                         merchant=merchant.todict(), ))

    def reset_order_status(self, order_entity):
        order = OrderModel.get_by_main_order_id(self.db, order_entity.id)
        if not order:
            raise JsonException(1, 'order not exist')

        pre_status = order.status

        OrderModel.change_order_status_by_main_order_id(self.db, order_entity.id, 0)
        OrderHistoryModel.set_order_status_by_server(self.db, order, pre_status, 0)


class CancelOrderAPIHander(BtwBaseHandler):

    @gen.coroutine
    def post(self, order_id):
        yield self.cancel_order_by_server(order_id)
        self.finish_json(result=dict(order_id=order_id, ))


    @gen.coroutine
    def cancel_order_by_server(self, order_id):
        order = OrderModel.get_by_id(self.db, order_id)
        if not order:
            raise JsonException(2000, 'no order')

        pre_status = order.status

        if order.status == 0 or order.status == 100:
            _order = yield self.cancel_before_user_confirm(order.id)
        elif order.status == 300:
            _order = yield self.cancel_after_user_confirm(order.id)
        elif order.status in [400, 500, 600]:
            raise gen.Return(order)
        elif self.current_user.type == UserModel.TYPE_SUB and order.hotel_id != self.current_user.hotel_id:
            raise JsonException(500, 'illegal hotel')
        else:
            raise JsonException(1000, 'illegal status')


        if _order.status != pre_status:
            OrderHistoryModel.set_order_status_by_server(self.db, _order, pre_status, _order.status)
        raise gen.Return(_order)

    @gen.coroutine
    def cancel_before_user_confirm(self, order_id):
        task = yield gen.Task(Cancel.cancel_order_before_user_confirm.apply_async, args=[order_id])
        
        if task.status == 'SUCCESS':
            raise gen.Return(task.result) 
        else:
            if isinstance(task.result, CeleryException):
                raise JsonException(task.result.errcode, task.result.errmsg)
            else:
                raise task.result

    @gen.coroutine
    def cancel_after_user_confirm(self, order_id):
        task = yield gen.Task(Cancel.cancel_order_after_user_confirm.apply_async, args=[order_id])

        if task.status == 'SUCCESS':
            raise gen.Return(task.result) 
        else:
            if isinstance(task.result, CeleryException):
                raise JsonException(task.result.errcode, task.result.errmsg)
            else:
                raise task.result


class UpdateOrderPayStatusApiHander(BtwBaseHandler):

    @gen.coroutine
    def post(self):
        order_id = self.get_argument('order_id', None)
        if not order_id:
            raise JsonException(-1, '缺少order_id')
        try:
            OrderModel.change_order_pay_by_main_order_id(self.db, order_id)
            self.finish_json()
        except Exception, e:
            raise JsonException(-1, e.message)
