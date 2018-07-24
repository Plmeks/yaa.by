﻿$(document).ready(function(){
    var myMap, placeMark;
    if ($('#yandexMap').length) {
        ymaps.ready(function () {
            $("#map-yandex").removeClass('hidden');
            myMap = new ymaps.Map("yandexMap", {
                center: [52.422304, 31.003549],
                zoom: 17
            });
            myMap.controls.add('zoomControl');

            placeMark = new ymaps.Placemark([52.422225, 31.00395], {
                hintContent: 'ООО «УчетАнализАудит»',
                balloonContent: 'Бухгалтерские и консалтинговые услуги в Гомеле. <br> <strong>г. Гомель, ул. Гагарина, 49, бизнес-центр «Авангард», пристройка, 2-й этаж, каб. 32-9.</sctrong>'
            }, {
                preset: "twirl#redIcon"
            });

            myMap.geoObjects.add(placeMark);
        });
    }
});