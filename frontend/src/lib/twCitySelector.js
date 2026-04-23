import TwCitySelectorModule from "tw-city-selector";

const TwCitySelector = globalThis.TwCitySelector || TwCitySelectorModule;

if (!globalThis.TwCitySelector) {
  globalThis.TwCitySelector = TwCitySelector;
}

export default TwCitySelector;
