# -*- coding: utf-8 -*-

from tornado.util import ObjectDict

from sqlalchemy import Column
from sqlalchemy.dialects.mysql import BIT, INTEGER, VARCHAR, DATETIME, BIGINT


from models import Base

class CooperateHotelModel(Base):

    __tablename__ = 'cooperateHotel'
    __table_args__ = {
        'mysql_charset': 'utf8', 'mysql_engine': 'InnoDB'}

    id = Column(INTEGER, primary_key=True, autoincrement=True)
    merchant_id = Column("merchantId", INTEGER, nullable=False, default=0)
    base_hotel_id = Column("baseHotelId", INTEGER, nullable=False, default=0)
    is_online = Column('isOnline', BIT, nullable=False, default=1)
    is_delete = Column('isDelete', BIT, nullable=False, default=0)
    is_suspend = Column('isSuspend', BIT, nullable=False, default=0)

    @classmethod
    def get_by_id(cls, session, id, with_delete=False):
        query = session.query(CooperateHotelModel)\
            .filter(CooperateHotelModel.id == id)
        if not with_delete:
            query = query.filter(CooperateHotelModel.is_delete == 0)
        return query.first()

    @classmethod
    def get_by_merchant_id(cls, session, merchant_id, is_online=None, with_delete=False, hotel_id=None):
        query = session.query(CooperateHotelModel)\
            .filter(CooperateHotelModel.merchant_id == merchant_id)
        if is_online is not None:
            query = query.filter(CooperateHotelModel.is_online == is_online)
        if not with_delete:
            query = query.filter(CooperateHotelModel.is_delete == 0)
        if hotel_id:
            query = query.filter(CooperateHotelModel.id == hotel_id)
        return query.all()

    @classmethod
    def get_by_merchant_id_and_hotel_id(cls, session, merchant_id, hotel_id):
        return session.query(CooperateHotelModel)\
            .filter(CooperateHotelModel.id == hotel_id)\
            .filter(CooperateHotelModel.merchant_id == merchant_id)\
            .filter(CooperateHotelModel.is_delete == 0)\
            .first()

    @classmethod
    def get_by_merchant_id_and_base_hotel_id(cls, session, merchant_id, base_hotel_id, with_delete=False):
        query = session.query(CooperateHotelModel)\
            .filter(CooperateHotelModel.merchant_id == merchant_id)\
            .filter(CooperateHotelModel.base_hotel_id == base_hotel_id)
        if not with_delete:
            query = query.filter(CooperateHotelModel.is_delete == 0)

        return query.first()

    @classmethod
    def new_hotel_cooprate(cls, session, merchant_id, base_hotel_id, commit=True):
        coop = CooperateHotelModel(merchant_id=merchant_id, base_hotel_id=base_hotel_id)
        session.add(coop)
        if commit:
            session.commit()
        else:
            session.flush()

        return coop

    @classmethod
    def new_hotel_cooprates(cls, session, merchant_id, base_hotel_ids, commit=True):
        coops = []
        for base_hotel_id in base_hotel_ids:
            coop = cls.get_by_merchant_id_and_base_hotel_id(session, merchant_id, base_hotel_id)
            if not coop:
                coop = CooperateHotelModel(merchant_id=merchant_id, base_hotel_id=base_hotel_id)
            coops.append(coop)
        session.add_all(coops)

        if commit:
            session.commit()
        else:
            session.flush()

        return coops

    @classmethod
    def delete_hotel_cooprate(cls, session, merchant_id, base_hotel_id):
        coop = cls.get_by_merchant_id_and_hotel_id(
            session, merchant_id, base_hotel_id)
        if coop:
            coop.is_delete = 1
            session.commit()
        return coop

    @classmethod
    def set_suspend_by_merchant_id(cls, session, merchant_id, is_suspend, auto_commit=False):
        session.query(CooperateHotelModel)\
            .filter(CooperateHotelModel.merchant_id == merchant_id, CooperateHotelModel.is_delete == 0)\
            .update({CooperateHotelModel.is_suspend: is_suspend})
        if auto_commit:
            session.commit()

    def todict(self):
        return ObjectDict(
            id=self.id,
            merchant_id=self.merchant_id,
            base_hotel_id=self.base_hotel_id,
            is_online=self.is_online,
            is_suspend=self.is_suspend,
        )
