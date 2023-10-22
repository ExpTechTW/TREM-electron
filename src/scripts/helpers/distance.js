class Distance {
  constructor(type, first) {
    this.type = type;
    this.first = first;
  }

  static from(point) {
    if (Number.isFinite(point))
      return new this("side", point);
    else
      return new this("coord", point);
  }

  to(point) {
    if (this.type == "coord")
      return (((this.first.lat - point.lat) * 111) ** 2 + ((this.first.lon - point.lon) * 101) ** 2) ** 0.5;
    else
      return (this.first ** 2 + point ** 2) ** 0.5;
  }
}

module.exports = Distance;