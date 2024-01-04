/**
 * @typedef data
 * @property {Record<string, {Lat:number,Long:number,PGA:number,Loc:string,area:string}>} station
 */

let rtsData = {};

fetch("https://raw.githubusercontent.com/ExpTechTW/API/master/resource/station.json")
  .then((res) => res.json())
  .then((v) => rtsData = v);

/**
 * @type {data}
 */
module.exports = {
  get station() {
    return rtsData;
  },
};