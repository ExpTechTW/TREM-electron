let Lat = 25.0421407
let Long = 121.5198716
let audioList = []
let audioLock = false
let ReportCache = {}
let ReportMark = null
let ReportMarkID = null
let UUID = uuid()
let marker = null
let map

//#region 初始化
init()
function init() {
    map = L.map('map', {
        attributionControl: false,
        closePopupOnClick: false
    }).setView([23, 121], 7.5)

    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
        maxZoom: 14,
        id: 'mapbox/dark-v10',
        tileSize: 512,
        zoomOffset: -1
    }).addTo(map)

    navigator.geolocation.getCurrentPosition(function (position) {
        Lat = Number(position.coords.latitude)
        Long = Number(position.coords.longitude)
        Loc()
    })

    Loc()

    ReportGET()
}
//#endregion

//#region 地震速報 連接 伺服器
if ("WebSocket" in window) {
    var ws = new WebSocket("ws://150.117.110.118:910")

    ws.onopen = async function () {
        ws.send(JSON.stringify({
            "APIkey": "https://github.com/ExpTechTW",
            "Function": "earthquakeService",
            "Type": "subscription",
            "FormatVersion": 1,
            "UUID": UUID
        }))
        console.log("UUID >> " + UUID)
    }

    ws.onmessage = async function (evt) {
        let json = JSON.parse(evt.data)
        if (json.Function == "report") {
            ReportGET()
        } else if (json.Function == "earthquake") {
            audioPlay("./audio/main/1/alert.wav")
            let point = Math.sqrt(Math.pow(Math.abs(Lat + (Number(json.NorthLatitude) * -1)) * 111, 2) + Math.pow(Math.abs(Long + (Number(json.EastLongitude) * -1)) * 101, 2))
            let distance = Math.sqrt(Math.pow(Number(json.Depth), 2) + Math.pow(point, 2))
            let value = Math.round((distance - ((new Date().getTime() - json.Time) / 1000) * 3.5) / 3.5)

            let level = "0"
            let PGA = (1.657 * Math.pow(Math.E, (1.533 * json.Scale)) * Math.pow(distance, -1.607)).toFixed(3)
            if (PGA >= 800) {
                level = "7"
            } else if (800 >= PGA && 440 < PGA) {
                level = "6+"
            } else if (440 >= PGA && 250 < PGA) {
                level = "6-"
            } else if (250 >= PGA && 140 < PGA) {
                level = "5+"
            } else if (140 >= PGA && 80 < PGA) {
                level = "5-"
            } else if (80 >= PGA && 25 < PGA) {
                level = "4"
            } else if (25 >= PGA && 8 < PGA) {
                level = "3"
            } else if (8 >= PGA && 2.5 < PGA) {
                level = "2"
            } else if (2.5 >= PGA && 0.8 < PGA) {
                level = "1"
            } else {
                level = "0"
            }
            audioPlay(`./audio/main/1/${level.replace("+", "").replace("-", "")}.wav`)
            if (level.includes("+")) {
                audioPlay(`./audio/main/1/intensity-strong.wav`)
            } else if (level.includes("-")) {
                audioPlay(`./audio/main/1/intensity-weak.wav`)
            } else {
                audioPlay(`./audio/main/1/intensity.wav`)
            }
            if (value > 0) {
                if (value <= 10) {
                    audioPlay(`./audio/main/1/${value.toString()}.wav`)
                } else if (value < 20) {
                    audioPlay(`./audio/main/1/x${value.toString().substring(1, 2)}.wav`)
                } else {
                    audioPlay(`./audio/main/1/${value.toString().substring(0, 1)}x.wav`)
                    audioPlay(`./audio/main/1/x${value.toString().substring(1, 2)}.wav`)
                }
                audioPlay(`./audio/main/1/second.wav`)
            }
            let time = -1
            let Stamp = 0
            let t = setInterval(async () => {
                value = Math.round((distance - ((new Date().getTime() - json.Time) / 1000) * 3.5) / 3.5)
                if (Stamp != value) {
                    Stamp = value
                    if (time >= 0) {
                        audioPlay(`./audio/main/1/ding.wav`)
                        time++
                        if (time >= 10) {
                            clearInterval(t)
                        }
                    } else {
                        if (value > 10) {
                            if (value.toString().substring(1, 2) == "0") {
                                audioPlay(`./audio/main/1/${value.toString().substring(0, 1)}x.wav`)
                                audioPlay(`./audio/main/1/x0.wav`)
                            } else {
                                audioPlay(`./audio/main/1/ding.wav`)
                            }
                        } else if (value > 0) {
                            audioPlay(`./audio/main/1/${value.toString()}.wav`)
                        } else {
                            audioPlay(`./audio/main/1/arrive.wav`)
                            time = 0
                        }
                    }
                }
            }, 0)
            if (ReportMarkID != null) {
                map.removeLayer(ReportMark)
                ReportMarkID = null
            }
            var myIcon = L.icon({
                iconUrl: './image/main/cross.png',
                iconSize: [30, 30],
            })
            L.marker([Number(json.NorthLatitude), Number(json.EastLongitude)], { icon: myIcon }).addTo(map)
            map.setView([Number(json.NorthLatitude), Number(json.EastLongitude)], 7.5)
            var Pcircle = null
            var Scircle = null
            let Loom = 0
            let Timer = setInterval(async () => {
                if (Pcircle != null) map.removeLayer(Pcircle)
                Pcircle = L.circle([Number(json.NorthLatitude), Number(json.EastLongitude)], {
                    color: '#6FB7B7',
                    fillColor: 'transparent',
                    radius: Math.sqrt(Math.pow((new Date().getTime() - json.Time) * 6.5, 2) - Math.pow(Number(json.Depth) * 1000, 2))
                })
                map.addLayer(Pcircle)
                if (Scircle != null) map.removeLayer(Scircle)
                Scircle = L.circle([Number(json.NorthLatitude), Number(json.EastLongitude)], {
                    color: 'red',
                    fillColor: '#F8E7E7',
                    fillOpacity: 0.1,
                    radius: Math.sqrt(Math.pow((new Date().getTime() - json.Time) * 3.5, 2) - Math.pow(Number(json.Depth) * 1000, 2))
                })
                map.addLayer(Scircle)
                if (new Date().getTime() - json.Time > 180000) {
                    map.removeLayer(Scircle)
                    map.removeLayer(Pcircle)
                    clearInterval(Timer)
                    map.setView([Lat, Long], 7.5)
                }
                if ((new Date().getTime() - json.Time) * 6.5 > 150000 && Loom < 150000) {
                    Loom = 150000
                    map.setView([Number(json.NorthLatitude), Number(json.EastLongitude)], 7)
                } else if ((new Date().getTime() - json.Time) * 6.5 > 250000 && Loom < 250000) {
                    Loom = 250000
                    map.setView([Number(json.NorthLatitude), Number(json.EastLongitude)], 6)
                } else if ((new Date().getTime() - json.Time) * 6.5 > 500000 && Loom < 500000) {
                    Loom = 500000
                    map.setView([Number(json.NorthLatitude), Number(json.EastLongitude)], 5)
                } else if ((new Date().getTime() - json.Time) * 6.5 > 1000000 && Loom < 1000000) {
                    Loom = 1000000
                    map.setView([Number(json.NorthLatitude), Number(json.EastLongitude)], 4)
                }
            }, 100)
        }
    }

    ws.onclose = function () {
        ws = new WebSocket("ws://150.117.110.118:910")
        alert("已重新連接至伺服器")
    }
} else {
    alert("你的瀏覽器不支援 WebSocket!")
}
//#endregion

//#region 用戶所在位置
function Loc() {
    if (marker != null) map.removeLayer(marker)
    marker = L.marker([Lat, Long])
    map.addLayer(marker)
    map.setView([Lat, Long], 7.5)
}
//#endregion

//#region 音頻播放
async function audioPlay(src) {
    audioList.push(src)
    if (audioLock == false) {
        audioLock = true
        let T = setInterval(async () => {
            if (audioList.length != 0) {
                Audio(audioList[0])
            } else {
                clearInterval(T)
            }
        }, 0)
    }

    function Audio(src) {
        audioLock = true
        audioList.splice(audioList.indexOf(src), 1)
        var audioDOM = document.getElementById("warning-update-player")
        audioDOM.src = src
        var promise = audioDOM.play()
        promise.then(resolve => {
            audioDOM.addEventListener("ended", function () {
                audioLock = false
            })
        }).catch(reject => {

        })
    }
}
//#endregion

//#region Report Data
function ReportGET() {
    let data = {
        "APIkey": "https://github.com/ExpTechTW",
        "Function": "data",
        "Type": "earthquake",
        "FormatVersion": 1
    }

    axios.post('http://150.117.110.118:10150', data)
        .then(function (response) {
            ReportList(response.data)
        })
        .catch(function (error) {
            console.log(error)
        })
}
//#endregion

//#region Report 點擊
async function ReportClick(time) {
    if (ReportMarkID == time) {
        map.removeLayer(ReportMark)
        ReportMarkID = null
    } else {
        ReportMarkID = time
        if (ReportMark != null) map.removeLayer(ReportMark)
        var myIcon = L.icon({
            iconUrl: './image/main/star.png',
            iconSize: [30, 30],
        })
        map.setView([Number(ReportCache[time].epicenterLat), Number(ReportCache[time].epicenterLon)], 7.5)
        ReportMark = L.marker([Number(ReportCache[time].epicenterLat), Number(ReportCache[time].epicenterLon)], { icon: myIcon }).addTo(map)
    }
}
//#endregion

//#region Report list
async function ReportList(Data) {
    for (let index = 0; index < Data["response"]["data"].length; index++) {
        let DATA = Data["response"]["data"][index]
        var roll = document.getElementById("rolllist")
        var Div = document.createElement("DIV")
        Div.style.height = "auto"
        Div.style.overflow = "hidden"
        Div.style.paddingRight = "3%"
        if (index == 0) {
            Div.innerHTML =
                `<div class="background" style="display: flex; align-items:center; padding:2%;">
                <div class="left" style="width:30%; text-align: center;">
                    <font color="white" size="3">最大震度</font><br><b><font color="white" size="7">${DATA["data"][0]["areaIntensity"]}</font></b>
                </div>
                <div class="middle" style="width:60%;">
                    <b><font color="white" size="4">${DATA["location"].substring(DATA["location"].indexOf("(") + 1, DATA["location"].indexOf(")")).replace("位於", "")}</font></b>
                    <br><font color="white" size="2">${DATA["originTime"]}</font>
                    <br><b><font color="white" size="6">M${DATA["magnitudeValue"]} </font></b><br><font color="white" size="2"> 深度: </font><b><font color="white" size="4">${DATA["depth"]}km</font></b>
                </div>
            </div>`
        } else {
            Div.innerHTML =
                `<div class="background" style="display: flex; align-items:center;">
                <div class="left" style="width:20%; text-align: center;">
                    <b><font color="white" size="6">${DATA["data"][0]["areaIntensity"]}</font></b>
                </div>
                <div class="middle" style="width:60%;">
                    <b><font color="white" size="3">${DATA["location"].substring(DATA["location"].indexOf("(") + 1, DATA["location"].indexOf(")")).replace("位於", "")}</font></b>
                    <br><font color="white" size="2">${DATA["originTime"]}</font>
                </div>
                <div class="right">
                <b><font color="white" size="5">M${DATA["magnitudeValue"]}</font></b>
                </div>
            </div>`
        }
        if (DATA["data"][0]["areaIntensity"] == 1) {
            Div.style.backgroundColor = "gray"
        } else if (DATA["data"][0]["areaIntensity"] == 2) {
            Div.style.backgroundColor = "#0072E3"
        } else if (DATA["data"][0]["areaIntensity"] == 3) {
            Div.style.backgroundColor = "#00DB00"
        } else if (DATA["data"][0]["areaIntensity"] == 4) {
            Div.style.backgroundColor = "#EAC100"
        } else if (DATA["data"][0]["areaIntensity"] == 5) {
            Div.style.backgroundColor = "#FFA042"
        } else if (DATA["data"][0]["areaIntensity"] == 5) {
            Div.style.backgroundColor = "#D94600"
        } else if (DATA["data"][0]["areaIntensity"] == 6) {
            Div.style.backgroundColor = "#EA0000"
        } else if (DATA["data"][0]["areaIntensity"] == 6) {
            Div.style.backgroundColor = "#AE0000"
        } else if (DATA["data"][0]["areaIntensity"] == 7) {
            Div.style.backgroundColor = "#930093"
        }
        Div.addEventListener("click", function () {
            ReportCache[DATA["originTime"]] = Data["response"]["data"][index]
            ReportClick(DATA["originTime"])
        })
        roll.appendChild(Div)
    }
}
//#endregion

//document.cookie = `${JSON.stringify()}; expires=Thu, 18 Dec 2043 12:00:00 GMT; path=/`