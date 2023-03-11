/**
 * Api request maker
 * @class RequestMaker
 */
class RequestMaker {
  constructor(apiKey, apiVersion = 1) {
    this.apiKey = apiKey ?? "https://github.com/ExpTechTW";

    switch (apiVersion) {
      case 0:
        this.baseurl = "https://exptech.com.tw";
        break;

      default:
        this.baseurl = `https://exptech.com.tw/api/v${apiVersion}`;
        break;
    }
  }

  async get(endpoint, parms = {}) {
    const response = await fetch(`${this.baseurl + endpoint}?${new URLSearchParams({ ...parms })}`, {
      method: "GET",
    });

    if (!response.ok)
      throw new Error(`The server responded with status code ${response.status}`);
    else if (response.status == 200)
      return response.json();

    return true;
  }

  async post(endpoint, body = {}) {
    const response = await fetch(this.baseurl + endpoint, {
      method  : "POST",
      headers : { "content-type": "application/json" },
      body    : JSON.stringify({
        apiKey: this.apiKey,
        ...body,
      }),
    });

    if (!response.ok)
      throw new Error(`The server responded with status code ${response.status}`);
    else if (response.status == 200)
      return response.json();

    return true;
  }
}

/**
 * The v1 api
 * @class V1
 * @extends RequestMaker
 */
class V1 extends RequestMaker {
  constructor(apiKey) {
    super(apiKey, 1);
    this.earthquake = {

      /**
       * @typedef {Object} EarthquakeInfo
       * @property {string} identifier - 報告識別碼
       * @property {number} earthquakeNo - 地震編號
       * @property {number} epicenterLon - 震央經度
       * @property {number} epicenterLat - 震央緯度
       * @property {string} location - 震央位置
       * @property {number} depth - 震央深度
       * @property {number} magnitudeValue - 地震規模
       * @property {string} originTime - 地震發生時間
       * @property {Area[]} data - 地區資料陣列
       * @property {string[]} ID - 播報識別碼陣列
       * @property {string[]} trem - TREM 偵測識別碼陣列
       */

      /**
       * @typedef {Object} EarthquakeReport
       * @property {string} identifier - 報告識別碼
       * @property {number} earthquakeNo - 地震編號
       * @property {number} epicenterLon - 震央經度
       * @property {number} epicenterLat - 震央緯度
       * @property {string} location - 震央位置
       * @property {number} depth - 震央深度
       * @property {number} magnitudeValue - 地震規模
       * @property {string} originTime - 地震發生時間
       * @property {Area[]} data - 地區資料陣列
       * @property {string[]} ID - 播報識別碼陣列
       * @property {string[]} trem - TREM 偵測識別碼陣列
       */

      /**
       * @typedef {Object} Area
       * @property {string} areaName - 地區名稱
       * @property {number} areaIntensity - 地區震度
       * @property {eqStation[]} eqStation - 地震站資料陣列
       */

      /**
       * @typedef {Object} eqStation
       * @property {string} stationName - 地震站名稱
       * @property {number} stationLon - 地震站經度
       * @property {number} stationLat - 地震站緯度
       * @property {number} distance - 震央與地震站距離
       * @property {number} stationIntensity - 地震站震度
       */

      /**
       * 擷取地震報告。
       * @param {number} [limit = 15] 擷取報告的數量。
       * @returns {Promise<Array<EarthquakeInfo|EarthquakeReport>>}
       * @example
       * // 擷取 10 個報告
       * // 將回傳 Array<EarthquakeInfo|EarthquakeReport>
       * const reports = await ExptechAPI.v1.earthquake.getReports(10);
       */
      getReports: async (limit = 15) => await this.get("/earthquake/reports", {
        limit,
      }),

      /**
       * @typedef {Object} Link
       * @property {Object} web - 頁面格式中地震事件的資訊
       * @property {Object} event_image - 頁面格式中地震事件圖片的資訊
       * @property {Object} shake_image - 頁面格式中震度圖的資訊
       */

      /**
       * @typedef {Object} UnitValuePair
       * @property {string} unit - 單位
       * @property {string} $t - 測量值
       */

      /**
       * @typedef {Object} Station
       * @property {string} stationName - 測站名稱
       * @property {string} stationCode - 測站代碼
       * @property {UnitValuePair} stationLon - 測站經度
       * @property {UnitValuePair} stationLat - 測站緯度
       * @property {UnitValuePair} distance - 測站與震央之距離
       * @property {UnitValuePair} azimuth - 測站與震央之方位角
       * @property {UnitValuePair} stationIntensity - 測站所觀測到的烈度
       * @property {Object} pga - 測站所觀測到的地表峰值加速度
       * @property {string} pga.unit - 單位
       * @property {string} pga.vComponent - 垂直方向地表峰值加速度
       * @property {string} pga.nsComponent - 北南方向地表峰值加速度
       * @property {string} pga.ewComponent - 東西方向地表峰值加速度
       * @property {string} waveImageURI - 測站波形圖的 URL
       */

      /**
       * @typedef {Object} Intensity
       * @property {string} areaDesc - 區域描述
       * @property {UnitValuePair} areaMaxIntensity - 區域內最大烈度
       * @property {Station[]} station - 區域內的測站列表
       */

      /**
       * @typedef {Object} DetailedEarthquakeReport
       * @property {number} time - 地震的 Unix 時間戳記
       * @property {string} lon - 震央經度
       * @property {string} lat - 震央緯度
       * @property {string} depth - 地震深度
       * @property {string} scale - 地震規模
       * @property {string} id - 地震 ID
       * @property {string} location - 震央位置描述
       * @property {boolean} cancel - 地震是否取消
       * @property {Link} link - 相關網頁和圖片的 URL
       * @property {string} max - 觀測到的最大烈度
       * @property {Intensity[]} intensity - 不同區域內觀測到的烈度列表
       */

      /**
       * 以報告編號取得特定地震報告。
       * @param {number} earthquakeNo 要擷取的報告編號。
       * @returns {Promise<DetailedEarthquakeReport>}
       * @example
       * // 擷取編號為 112017 的報告
       * // 將回傳 DetailedEarthquakeReport 物件
       * const report = await ExptechAPI.v1.earthquake.getReportByNumber(112017);
       */
      getReportByNumber: async (earthquakeNo) => {
        if (!Number.isInteger(earthquakeNo)) throw new TypeError(`"${earthquakeNo}" 不是整數`);
        return await this.get(`/earthquake/reports/${earthquakeNo}`);
      },
    };
  }
}

class ExptechAPI {

  /**
   * @param {string} [apiKey="https://github.com/ExpTechTW"] API 金鑰
   */
  constructor(apiKey) {

    /**
     * @type {V1} The v1 api.
     */
    this.v1 = new V1(apiKey);
  }
}


export default ExptechAPI;