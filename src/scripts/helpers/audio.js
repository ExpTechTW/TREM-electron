const AudioDictionary = {
  update : "../assets/audio/trem_default/Update.wav",
  pga1   : "../assets/audio/trem_default/PGA1.wav",
  pga2   : "../assets/audio/trem_default/PGA2.wav",
  int0   : "../assets/audio/trem_default/Int0.wav",
  int1   : "../assets/audio/trem_default/Int1.wav",
  int2   : "../assets/audio/trem_default/Int2.wav",
  cwb    : "../assets/audio/trem_default/EEWCWB.wav",
  eew    : "../assets/audio/trem_default/EEW.wav",
  eew2   : "../assets/audio/trem_default/EEW2.wav",
  report : "../assets/audio/trem_default/Report.wav",
};

const playAudio = (name, volume) => {
  const audio = new Audio(AudioDictionary[name]);
  audio.volume = +volume / 100;
  audio.play();
};

module.exports = { playAudio };