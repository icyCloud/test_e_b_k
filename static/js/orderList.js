(function() {

	var orderListApp = angular.module('orderListApp', ['myApp.service','myApp.directives']);


	orderListApp.directive('ngEnter', function() {
		return function(scope, element, attrs) {
			element.bind("keydown keypress", function(event) {
				if (event.which === 13) {
					scope.$apply(function() {
						scope.$eval(attrs.ngEnter);
					});

					event.preventDefault();
				}
			});
		};
	});



	orderListApp.config(['$httpProvider', function($httpProvider) {

		if (!$httpProvider.defaults.headers.get) {
			$httpProvider.defaults.headers.get = {};
			// $httpProvider.defaults.headers.post = {};    

		}

		$httpProvider.defaults.headers.get['If-Modified-Since'] = '0';
	}]);



	orderListApp.controller('orderListBookCtrl', ['$scope', '$http', 'log',function($scope, $http, log) {

		$scope.todayBook = {};
		$scope.itemPerPage = "20";
		$scope.currentPage = 1;
		$scope.total;
		$scope.pageCount;
		$scope.directiveCtl = false;
		$scope.finalUrl;
		$scope.paginationId = "pagebookNumber";


		$scope.currentOrder;


		$scope.roomBedType = ['单床', '大床', '双床', '三床', '三床-1大2单', '榻榻米', '拼床', '水床', '榻榻米双床', '榻榻米单床', '圆床', '上下铺', '大床或双床'];



		$scope.checkPayType = function(payType) {
			if (payType == "0") {
				return "现付";
			} else if (payType == "1") {
				return "预付";
			}
		}


		$scope.checkBedType = function(bedType) {

			var currentBedType = $scope.roomBedType[parseInt(bedType)];

			if ($.trim(currentBedType) != "" && currentBedType != undefined && currentBedType != null)

			{
				return currentBedType;
			} else {
				return "";
			}


		}

		$scope.checkBreakFast = function(breakfast) {


			if ($.trim(breakfast) == "" || breakfast == undefined || breakfast == null) {
				return "";
			} else {

				var everyBreakFast = breakfast.split(",");

				var currentBreakFast = everyBreakFast[0];
				if (currentBreakFast == "0") {
					return "无早餐";

				} else if (currentBreakFast == "1") {
					return "一份早餐";

				} else if (currentBreakFast == "2") {
					return "两份早餐";

				} else if (currentBreakFast == "100") {
					return "按人头早餐";

				} else {
					return "";

				}

			}

		}


		$scope.resonStatusCheck = function(a, b) {

			if (a == "拒绝") {
				return b;
			} else {
				return "无";
			}


		}


		$scope.getCancelStatus = function(m,n) {

			var cancel;

			if (m == "0") {
				cancel="不可取消";
			} else if (m == "1") {
				cancel="自由取消";
			} else if (m == "2") {
				cancel="提前取消";
			}

			var punish;

			if (n == "0") {
				punish="不扣任何费用";
			} else if (n == "1") {
				punish="扣首晚房费";
			} else if (n == "2") {
				punish="扣全额房费";
			}else if (n == "3") {
				punish="扣定额";
			}else if (n == "4") {
				punish="扣全额房费百分比";
			}

			var cancelResult=cancel+",取消时"+punish;

			return cancelResult;



		}


		$scope.orderDetail = function(m) {

			$scope.currentOrder = m;

			$("#bookhotel-detail").show();

		}


		$scope.closeDetail = function() {
			$("#bookhotel-detail").hide();

		}



		$scope.orderPrint = function(m) {

			$scope.currentOrder = m;


			$(".header").hide();
			$(".main-left").hide();
			$("#tabcontent1").children("div").not($("#printwebbook")).hide();
			$("#tabcontent1").children("table").hide();
			$(".tabList").hide();
			$("#notice").hide();
			$("#printwebbook").show();

			setTimeout(function() {
				window.print();

				$("#printwebbook").hide();
				$(".header").show();
				$(".main-left").show();
				$("#tabcontent1").children("table").show();

				if ($scope.total > 0) {
					$("#pagebookInfo").show();
				}

				$(".tabList").show();
				$("#notice").show();
			}, 0);


		}



		$scope.getConfirmType = function getConfirmType(v) {
			if (v == "2") {
				return "手动确认";
			} else if (v == "1") {
				return "自动确认";
			} else {
				return " ";
			}

		}

		

		function dateTimeChecker(a, b, c) {
			var day = new Date();

			day.setFullYear(a);
			day.setMonth((b-1), 1);
			day.setDate(c);

			var dayTime = day.getTime();
			return dayTime;

		}



		$scope.DateDiff = function DateDiff(startDate, endDate) {
			var splitDate, startTime, endTime, iDays;
			splitDate = startDate.split("-");
			startTime = dateTimeChecker(splitDate[0], splitDate[1], splitDate[2]);
			splitDate = endDate.split("-");
			endTime = dateTimeChecker(splitDate[0], splitDate[1], splitDate[2]);
			iDays = parseInt(Math.abs(startTime - endTime) / 1000 / 60 / 60 / 24);

			var daysResult = "( " + iDays + "晚 )";
			return daysResult;
		}








		$scope.urlCheck = function urlCheck(a) {
			$scope.currentPage = a;

			var pageNum = ($scope.currentPage - 1) * ($scope.itemPerPage);

			var url = '/api/order/todaybook/?start=' + pageNum;

			if ($.trim($scope.itemPerPage) != "" && $scope.itemPerPage != undefined) {
				url = url + "&limit=" + $scope.itemPerPage;

			}
			$scope.finalUrl = url;

		}

		$scope.searchResult = function searchResult() {

			//console.log($scope.finalUrl);
			$http.get($scope.finalUrl)
				.success(function(resp) {
					log.log(resp);
					if (resp.errcode == 0) {
						$scope.todayBook = resp.result.orders;

						$scope.total = resp.result.total;
						if ($scope.total != 0) {
							$("#pagebookInfo").show();
						} else {
							$("#pagebookInfo").hide();
						}

						var todayBookLength = $scope.todayBook.length;

						for (var i = 0; i < $scope.todayBook.length; i++) {

							var is_pay = $scope.todayBook[i]['is_pay'];
							$scope.todayBook[i]['is_pay'] = is_pay == 1 ? '已付款' : '未付款';

							var hotelEverydayPrice=$scope.todayBook[i]["everyday_price"].split(",");
							
							for (var k = 0; k < hotelEverydayPrice.length; k++) {

								hotelEverydayPrice[k]=hotelEverydayPrice[k]/100;
								
							};

							var everyPrice=hotelEverydayPrice.join(",");


							$scope.todayBook[i]["everyday_price"] = everyPrice;

							$scope.todayBook[i]["total_price"] = ($scope.todayBook[i]["total_price"]) / 100;


							/*过滤状态为200的*/
							var bookStatus = $scope.todayBook[i]["status"];
							if (bookStatus == "200") {
								$scope.todayBook.splice(i, 1);
								i--;
								continue;
							}
							/*过滤状态为200的*/
							else {

								var temp = $scope.todayBook[i]["customer_info"];
								var tempobj = eval(temp);
								$scope.todayBook[i]["customer_info"] = tempobj;
								//$scope.todayBook[i]["everyday_price"] = ($scope.todayBook[i]["everyday_price"]) / 100;
								var temptime = $scope.todayBook[i]["create_time"].split(" ");
								$scope.todayBook[i]["create_time"] = temptime;


								if (bookStatus == "100") {

									$scope.todayBook[i]["status"] = "待确定";

								} else if (bookStatus == "300") {

									$scope.todayBook[i]["status"] = "接受";

								} else if (bookStatus == "400") {

									$scope.todayBook[i]["status"] = "拒绝";

								} else if (bookStatus == "500" || bookStatus == "600") {

									$scope.todayBook[i]["status"] = "服务器取消";

								}

							}

						};

						$scope.itemPerPage = resp.result.limit;

						$scope.pageCount = Math.ceil(($scope.total) / ($scope.itemPerPage));

						$scope.directiveCtl = true;

					} else {
						log.log(resp.errmsg);
					}
				})
				.error(function() {
					log.log('network error');
				})

		}

		$scope.urlCheck(1);
		$scope.searchResult();
		$(".menu1").find("dd").eq(1).addClass("active");


	}])


	orderListApp.controller('orderListCheckCtrl', ['$scope', '$http', 'log',function($scope, $http, log) {

		$scope.todayCheckIn = {};

		$scope.itemPerPage = "20";
		$scope.currentPage = 1;
		$scope.total;
		$scope.pageCount;
		$scope.directiveCtl = false;
		$scope.finalUrl;
		$scope.paginationId = "pagecheckNumber";



		$scope.currentOrder;



		$scope.roomBedType = ['单床', '大床', '双床', '三床', '三床-1大2单', '榻榻米', '拼床', '水床', '榻榻米双床', '榻榻米单床', '圆床', '上下铺', '大床或双床'];



		$scope.checkPayType = function(payType) {
			if (payType == "0") {
				return "现付";
			} else if (payType == "1") {
				return "预付";
			}
		}


		$scope.checkBedType = function(bedType) {

			var currentBedType = $scope.roomBedType[parseInt(bedType)];

			if ($.trim(currentBedType) != "" && currentBedType != undefined && currentBedType != null)

			{
				return currentBedType;
			} else {
				return "";
			}


		}

		$scope.checkBreakFast = function(breakfast) {


			if ($.trim(breakfast) == "" || breakfast == undefined || breakfast == null) {
				return "";
			} else {

				var everyBreakFast = breakfast.split(",");

				var currentBreakFast = everyBreakFast[0];
				if (currentBreakFast == "0") {
					return "无早餐";

				} else if (currentBreakFast == "1") {
					return "一份早餐";

				} else if (currentBreakFast == "2") {
					return "两份早餐";

				} else if (currentBreakFast == "100") {
					return "按人头早餐";

				} else {
					return "";

				}

			}

		}


		$scope.resonStatusCheck = function(a, b) {

			if (a == "拒绝") {
				return b;
			} else {
				return "无";
			}


		}



		$scope.getCancelStatus = function(m,n) {

			var cancel;

			if (m == "0") {
				cancel="不可取消";
			} else if (m == "1") {
				cancel="自由取消";
			} else if (m == "2") {
				cancel="提前取消";
			}

			var punish;

			if (n == "0") {
				punish="不扣任何费用";
			} else if (n == "1") {
				punish="扣首晚房费";
			} else if (n == "2") {
				punish="扣全额房费";
			}else if (n == "3") {
				punish="扣定额";
			}else if (n == "4") {
				punish="扣全额房费百分比";
			}

			var cancelResult=cancel+",取消时"+punish;

			return cancelResult;



		}


		$scope.orderDetail = function(m) {

			$scope.currentOrder = m;

			$("#checkhotel-detail").show();

		}


		$scope.closeDetail = function() {
			$("#checkhotel-detail").hide();

		}



		$scope.orderPrint = function(m) {

			$scope.currentOrder = m;


			$(".header").hide();
			$(".main-left").hide();
			$("#tabcontent2").children("div").not($("#printwebcheck")).hide();
			$("#tabcontent2").children("table").hide();
			$(".tabList").hide();
			$("#notice").hide();
			$("#printwebcheck").show();

			setTimeout(function() {
				window.print();

				$("#printwebcheck").hide();
				$(".header").show();
				$(".main-left").show();
				$("#tabcontent2").children("table").show();

				if ($scope.total > 0) {
					$("#pagecheckInfo").show();
				}

				$(".tabList").show();
				$("#notice").show();
			}, 0);


		}



		$scope.getConfirmType = function getConfirmType(v) {
			if (v == "2") {
				return "手动确认";
			} else if (v == "1") {
				return "自动确认";
			} else {
				return " ";
			}

		}


		function dateTimeChecker(a, b, c) {
			var day = new Date();

			day.setFullYear(a);
			day.setMonth((b-1), 1);
			day.setDate(c);

			var dayTime = day.getTime();
			return dayTime;

		}



		$scope.DateDiff = function DateDiff(startDate, endDate) {
			var splitDate, startTime, endTime, iDays;
			splitDate = startDate.split("-");
			startTime = dateTimeChecker(splitDate[0], splitDate[1], splitDate[2]);
			splitDate = endDate.split("-");
			endTime = dateTimeChecker(splitDate[0], splitDate[1], splitDate[2]);
			iDays = parseInt(Math.abs(startTime - endTime) / 1000 / 60 / 60 / 24);

			var daysResult = "( " + iDays + "晚 )";
			return daysResult;
		}


		$scope.urlCheck = function urlCheck(a) {
			$scope.currentPage = a;

			var pageNum = ($scope.currentPage - 1) * ($scope.itemPerPage);

			var url = '/api/order/todaycheckin/?start=' + pageNum;

			if ($.trim($scope.itemPerPage) != "" && $scope.itemPerPage != undefined) {
				url = url + "&limit=" + $scope.itemPerPage;

			}
			$scope.finalUrl = url;

		}

		$scope.searchResult = function searchResult() {

			//console.log($scope.finalUrl);
			$http.get($scope.finalUrl)
				.success(function(resp) {
					log.log(resp);
					if (resp.errcode == 0) {
						$scope.todayCheckIn = resp.result.orders;

						$scope.total = resp.result.total;

						if ($scope.total != 0) {
							$("#pagecheckInfo").show();
						} else {
							$("#pagecheckInfo").hide();
						}

						/*for (var i = 0; i < $scope.todayCheckIn.length; i++) {

							var temp = $scope.todayCheckIn[i]["customer_info"];
							var tempobj = eval(temp);
							$scope.todayCheckIn[i]["customer_info"] = tempobj;
							$scope.todayCheckIn[i]["everyday_price"] = ($scope.todayCheckIn[i]["everyday_price"]) / 100;
							var temptime = $scope.todayCheckIn[i]["create_time"].split(" ");
							$scope.todayCheckIn[i]["create_time"] = temptime;
						};*/

						for (var i = 0; i < $scope.todayCheckIn.length; i++) {
							var is_pay = $scope.todayCheckIn[i]['is_pay'];
							$scope.todayCheckIn[i]['is_pay'] = is_pay == 1 ? '已付款' : '未付款';

							var hotelEverydayPrice=$scope.todayCheckIn[i]["everyday_price"].split(",");
							
							for (var k = 0; k < hotelEverydayPrice.length; k++) {

								hotelEverydayPrice[k]=hotelEverydayPrice[k]/100;
								
							};

							var everyPrice=hotelEverydayPrice.join(",");


							

							$scope.todayCheckIn[i]["everyday_price"] = everyPrice;

							$scope.todayCheckIn[i]["total_price"] = ($scope.todayCheckIn[i]["total_price"]) / 100;



							/*过滤状态为200的*/
							var checkStatus = $scope.todayCheckIn[i]["status"];
							if (checkStatus == "200") {
								$scope.todayCheckIn.splice(i, 1);
								i--;
								continue;
							}
							/*过滤状态为200的*/
							else {

								var temp = $scope.todayCheckIn[i]["customer_info"];
								var tempobj = eval(temp);
								$scope.todayCheckIn[i]["customer_info"] = tempobj;
								//$scope.todayCheckIn[i]["everyday_price"] = ($scope.todayCheckIn[i]["everyday_price"]) / 100;
								var temptime = $scope.todayCheckIn[i]["create_time"].split(" ");
								$scope.todayCheckIn[i]["create_time"] = temptime;


								if (checkStatus == "100") {

									$scope.todayCheckIn[i]["status"] = "待确定";

								} else if (checkStatus == "300") {

									$scope.todayCheckIn[i]["status"] = "接受";

								} else if (checkStatus == "400") {

									$scope.todayCheckIn[i]["status"] = "拒绝";

								} else if (checkStatus == "500" || checkStatus == "600") {

									$scope.todayCheckIn[i]["status"] = "服务器取消";

								}

							}

						};

						$scope.itemPerPage = resp.result.limit;

						$scope.pageCount = Math.ceil(($scope.total) / ($scope.itemPerPage));

						$scope.directiveCtl = true;


					} else {
						log.log(resp.errmsg);
					}
				})
				.error(function() {
					log.log('network error');
				})

		}

		$scope.urlCheck(1);
		$scope.searchResult();


	}])



	orderListApp.controller('orderListQueryCtrl', ['$scope', '$http','log', function($scope, $http, log) {

		$scope.queryList = {};
		$scope.itemPerPage = "20";
		$scope.currentPage = 1;
		$scope.total;
		$scope.pageCount;
		$scope.directiveCtl = false;
		$scope.finalUrl;
		$scope.paginationId = "pagequeryNumber";


		$scope.searchOrderId = "";
		$scope.searchHotelName = "";
		$scope.searchInPeople = "";
		$scope.searchStatus = "";
		$scope.messageLive = "";
		$scope.messageList = "";


		$scope.currentOrder;

		$scope.select_order = '';


		$('#liveStarTime').datepicker({

			format: "yyyy-mm-dd",
			language: "zh-CN",
			orientation: "top auto",
			autoclose: true,
			enableOnReadonly: true,
			showOnFocus: true


		});

		$('#liveEndTime').datepicker({

			format: "yyyy-mm-dd",
			language: "zh-CN",
			orientation: "top auto",
			autoclose: true,
			enableOnReadonly: true,
			showOnFocus: true


		});

		$('#ListStarTime').datepicker({

			format: "yyyy-mm-dd",
			language: "zh-CN",
			orientation: "top auto",
			autoclose: true,
			enableOnReadonly: true,
			showOnFocus: true


		});

		$('#ListEndTime').datepicker({

			format: "yyyy-mm-dd",
			language: "zh-CN",
			orientation: "top auto",
			autoclose: true,
			enableOnReadonly: true,
			showOnFocus: true


		});

		$scope.resonStatusCheck = function(a, b) {

			if (a == "拒绝") {
				return b;
			} else {
				return "无";
			}


		}



		$scope.roomBedType = ['单床', '大床', '双床', '三床', '三床-1大2单', '榻榻米', '拼床', '水床', '榻榻米双床', '榻榻米单床', '圆床', '上下铺', '大床或双床'];



		$scope.checkPayType = function(payType) {
			if (payType == "0") {
				return "现付";
			} else if (payType == "1") {
				return "预付";
			}
		}


		$scope.checkBedType = function(bedType) {

			var currentBedType = $scope.roomBedType[parseInt(bedType)];

			if ($.trim(currentBedType) != "" && currentBedType != undefined && currentBedType != null)

			{
				return currentBedType;
			} else {
				return "";
			}


		}

		$scope.checkBreakFast = function(breakfast) {


			if ($.trim(breakfast) == "" || breakfast == undefined || breakfast == null) {
				return "";
			} else {

				var everyBreakFast = breakfast.split(",");

				var currentBreakFast = everyBreakFast[0];
				if (currentBreakFast == "0") {
					return "无早餐";

				} else if (currentBreakFast == "1") {
					return "一份早餐";

				} else if (currentBreakFast == "2") {
					return "两份早餐";

				} else if (currentBreakFast == "100") {
					return "按人头早餐";

				} else {
					return "";

				}

			}

		}

		$scope.getCancelStatus = function(m,n) {

			var cancel;

			if (m == "0") {
				cancel="不可取消";
			} else if (m == "1") {
				cancel="自由取消";
			} else if (m == "2") {
				cancel="提前取消";
			}

			var punish;

			if (n == "0") {
				punish="不扣任何费用";
			} else if (n == "1") {
				punish="扣首晚房费";
			} else if (n == "2") {
				punish="扣全额房费";
			}else if (n == "3") {
				punish="扣定额";
			}else if (n == "4") {
				punish="扣全额房费百分比";
			}

			var cancelResult=cancel+",取消时"+punish;

			return cancelResult;



		}



		$scope.orderDetail = function(m) {

			log.log(m);

			$scope.currentOrder = m;

			$("#queryhotel-detail").show();


		}


		$scope.closeDetail = function() {
			$("#queryhotel-detail").hide();

		}



		$scope.orderPrint = function(m) {

			$scope.currentOrder = m;


			$(".header").hide();
			$(".main-left").hide();
			$("#tabcontent3").children("div").not($("#printwebquery")).hide();
			$("#tabcontent3").children("table").hide();
			$(".tabList").hide();
			$("#notice").hide();
			$("#printwebquery").show();

			setTimeout(function() {
				window.print();
								

				$(".search-div").show();
				$(".choose-div").show();

				$("#printwebquery").hide();
				$(".header").show();
				$(".main-left").show();
				$("#tabcontent3").children("table").show();

				if ($scope.total > 0) {
					$("#pagequeryInfo").show();
				}

				$(".tabList").show();
				$("#notice").show();
			}, 0);


		}



		$scope.getConfirmType = function getConfirmType(v) {
			if (v == "2") {
				return "手动确认";
			} else if (v == "1") {
				return "自动确认";
			} else {
				return " ";
			}

		}


		function dateTimeChecker(a, b, c) {
			var day = new Date();

			day.setFullYear(a);
			day.setMonth((b-1), 1);
			day.setDate(c);

			var dayTime = day.getTime();
			return dayTime;

		}



		$scope.DateDiff = function DateDiff(startDate, endDate) {
			var splitDate, startTime, endTime, iDays;
			splitDate = startDate.split("-");
			startTime = dateTimeChecker(splitDate[0], splitDate[1], splitDate[2]);
			splitDate = endDate.split("-");
			endTime = dateTimeChecker(splitDate[0], splitDate[1], splitDate[2]);
			iDays = parseInt(Math.abs(startTime - endTime) / 1000 / 60 / 60 / 24);

			var daysResult = "( " + iDays + "晚 )";
			return daysResult;
		}



		$scope.conditionReset = function conditionReset() {

			$scope.searchOrderId = "";
			$scope.searchHotelName = "";
			$scope.searchInPeople = "";
			$scope.searchStatus = "";
			$("#liveStarTime").val("");
			$("#liveEndTime").val("");
			$("#ListStarTime").val("");
			$("#ListEndTime").val("");

			$scope.messageList = " ";
			$scope.messageLive = " ";

			$scope.finalUrl = '/api/order/search/?start=0&limit=' + $scope.itemPerPage;

			$scope.searchResult();
		}


		$scope.urlCheck = function urlCheck(a) {

			$scope.currentPage = a;
			var liveStarTime = $("#liveStarTime").val();
			var liveEndTime = $("#liveEndTime").val();
			var ListStarTime = $("#ListStarTime").val();
			var ListEndTime = $("#ListEndTime").val();
			$scope.messageLive = "";
			$scope.messageList = "";

			if ((liveStarTime != "" && liveEndTime == "") || (liveEndTime != "" && liveStarTime == "")) {
				$scope.messageLive = "日期不能为空";
				return;
			}

			if ((ListStarTime != "" && ListEndTime == "") || (ListEndTime != "" && ListStarTime == "")) {
				$scope.messageList = "日期不能为空";
				return;
			}



			if (liveStarTime > liveEndTime) {
				$scope.messageLive = "起始日期大于结束日期";
				return;
			}
			if (ListStarTime > ListEndTime) {
				$scope.messageList = "起始日期大于结束日期";
				return;
			}

			var pageNum = ($scope.currentPage - 1) * ($scope.itemPerPage);

			var url = '/api/order/search/?start=' + pageNum;

			if ($.trim($scope.searchOrderId) != "" && $scope.searchOrderId != undefined) {
				url = url + "&order_id=" + $scope.searchOrderId;

			}

			if ($.trim($scope.searchHotelName) != "" && $scope.searchHotelName != undefined) {
				url = url + "&hotel_name=" + $scope.searchHotelName;

			}

			if ($.trim(liveStarTime) != "" && liveStarTime != undefined) {
				url = url + "&checkin_date_start=" + liveStarTime;

			}

			if ($.trim(liveEndTime) != "" && liveEndTime != undefined) {
				url = url + "&checkin_date_end=" + liveEndTime;

			}

			if ($.trim($scope.searchInPeople) != "" && $scope.searchInPeople != undefined) {
				url = url + "&customer=" + $scope.searchInPeople;

			}

			if ($.trim($scope.searchStatus) != "" && $scope.searchStatus != undefined && $scope.searchStatus != "0") {

				if ($scope.searchStatus == "500") {
					url = url + "&order_status=" + $scope.searchStatus + ",600";
				} else {
					url = url + "&order_status=" + $scope.searchStatus;
				}

			}

			if ($.trim(ListStarTime) != "" && ListStarTime != undefined) {
				url = url + "&create_time_start=" + ListStarTime;

			}
			if ($.trim(ListEndTime) != "" && ListEndTime != undefined) {
				url = url + "&create_time_end=" + ListEndTime;

			}
			if ($.trim($scope.itemPerPage) != "" && $scope.itemPerPage != undefined) {
				url = url + "&limit=" + $scope.itemPerPage;

			}

			$scope.finalUrl = encodeURI(url);


		}

		$scope.searchResult = function searchResult() {

			log.log($scope.finalUrl);
			$http.get($scope.finalUrl)
				.success(function(resp) {
					log.log(resp);
					if (resp.errcode == 0) {
						$scope.queryList = resp.result.orders;

						$scope.total = resp.result.total;
						if ($scope.total != 0) {
							$("#pagequeryInfo").show();
						} else {
							$("#pagequeryInfo").hide();
						}

						for (var i = 0; i < $scope.queryList.length; i++) {

							var is_pay = $scope.queryList[i]['is_pay'];
							$scope.queryList[i]['is_pay'] = is_pay == 1 ? '已付款' : '未付款';

							var hotelEverydayPrice=$scope.queryList[i]["everyday_price"].split(",");
							
							for (var k = 0; k < hotelEverydayPrice.length; k++) {

								hotelEverydayPrice[k]=hotelEverydayPrice[k]/100;
								
							};

							var everyPrice=hotelEverydayPrice.join(",");



							$scope.queryList[i]["everyday_price"] = everyPrice;

							$scope.queryList[i]["total_price"] = ($scope.queryList[i]["total_price"]) / 100;


							var queryStatus = $scope.queryList[i]["status"];
							if (queryStatus == "200") {
								$scope.queryList.splice(i, 1);
								i--;
								continue;
							} else {

								var temp = $scope.queryList[i]["customer_info"];
								var tempobj = eval(temp);
								$scope.queryList[i]["customer_info"] = tempobj;
								//$scope.queryList[i]["everyday_price"] = ($scope.queryList[i]["everyday_price"]) / 100;
								var temptime = $scope.queryList[i]["create_time"].split(" ");
								$scope.queryList[i]["create_time"] = temptime;


								if (queryStatus == "100") {

									$scope.queryList[i]["status"] = "待确定";

								} else if (queryStatus == "300") {

									$scope.queryList[i]["status"] = "接受";

								} else if (queryStatus == "400") {

									$scope.queryList[i]["status"] = "拒绝";

								} else if (queryStatus == "500" || queryStatus == "600") {

									$scope.queryList[i]["status"] = "服务器取消";

								}

							}

						};

						$scope.itemPerPage = resp.result.limit;

						$scope.pageCount = Math.ceil(($scope.total) / ($scope.itemPerPage));

						$scope.directiveCtl = true;

					} else {
						log.log(resp.errmsg);
					}
				})
				.error(function() {
					log.log('network error');
				})

		};

		$scope.exportExcel = function(){

			var params = $scope.finalUrl.split('?');
			var export_url = params[0] + 'export/?' + params[1];
			var data = {};

			var check_list = $(':checkbox:not([id$="all"])').filter(':checked');
			var order_ids = [];
			if(check_list.size() > 0){
				for(var i = 0; i < check_list.size(); i++){
					order_ids.push(parseInt($(check_list[i]).attr('id').split('_')[1]));
				}
			}
			data['order_ids'] = order_ids.join(',');

			$('#pagequeryInfo iframe').remove();
			$('#pagequeryInfo').append('<iframe id="exportFrame" src="#" height="0px" width="0px" ></iframe>');
			$('#pagequeryInfo #exportFrame').contents().find('body').append('<form id="exportForm" method="get"></form>');
			var exportForm =  $('#pagequeryInfo #exportFrame').contents().find('#exportForm');
			for(var k in data){
				var input = '<input name="' + k + '" type="hidden" value="' + data[k] + '" />';
				exportForm.append(input);
			}
			exportForm.attr('action', export_url);
			exportForm.submit();
		};
		$scope.change_select_order = function(str){
			var check = $('#select_' + str).prop('checked');
			if(str && str == 'all'){
				$(':checkbox:not([id$="all"])').prop('checked', check);
			}else{
				var child_obj = $(':checkbox:not([id$="all"])');
				var child_len = child_obj.size();
				var sel_len = child_obj.filter(':checked').size();
				if(child_len == sel_len){
					$('#select_all').prop('checked', true);
				}else{
					$('#select_all').prop('checked', false);
				}
			}
		};

		$scope.urlCheck(1);
		$scope.searchResult();
		$(".menu1").find("dd").eq(1).addClass("active");

	}])



})();