import { TAIWAN_CITY_DATA } from "./taiwanCityData.js";

const DEFAULT_OPTIONS = {
  el: null,
  elCounty: null,
  elDistrict: null,
  elZipcode: null,
  countyValue: null,
  districtValue: null,
  countyClassName: "county",
  countyFieldName: "county",
  districtClassName: "district",
  districtFieldName: "district",
  zipcodeClassName: "zipcode",
  zipcodeFieldName: "zipcode",
  disabled: false,
  hasZipcode: false,
  hiddenZipcode: false,
};

function resolveElement(selector, root = document) {
  if (!selector || !root) return null;
  if (selector instanceof Element) return selector;
  return root.querySelector(selector);
}

function clearOptions(select) {
  while (select.firstChild) {
    select.removeChild(select.firstChild);
  }
}

function addOption(select, label, value = label, data = {}) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  Object.entries(data).forEach(([key, item]) => {
    option.dataset[key] = String(item);
  });
  select.appendChild(option);
  return option;
}

export default class TwCitySelector {
  constructor(options = {}) {
    this.VERSION = "local-1.0.0";
    this.ROLE_ATTR_NAME = "tw-city-selector";
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.data = TAIWAN_CITY_DATA;
    this.el = null;
    this.elCounty = null;
    this.elDistrict = null;
    this.elZipcode = null;

    setTimeout(() => this.init(), 0);
  }

  init() {
    if (typeof document === "undefined") return this;

    this.el = resolveElement(this.options.el);
    if (!this.el) return this;

    this.applyRoleOptions();
    this.ensureControls();
    this.populateCounties();
    this.populateDistricts();
    this.bindEvents();
    this.setValue(this.options.countyValue, this.options.districtValue);

    return this;
  }

  applyRoleOptions() {
    if (!this.el) return;
    this.options.countyValue = this.options.countyValue ||
      this.el.getAttribute("data-county-value");
    this.options.districtValue = this.options.districtValue ||
      this.el.getAttribute("data-district-value");
    this.options.hasZipcode = this.options.hasZipcode ||
      this.el.getAttribute("data-has-zipcode") !== null;
    this.options.hiddenZipcode = this.options.hiddenZipcode ||
      this.el.getAttribute("data-hidden-zipcode") !== null;
    this.options.disabled = this.options.disabled ||
      this.el.getAttribute("data-disabled") !== null;
  }

  ensureControls() {
    this.elCounty = resolveElement(this.options.elCounty, this.el);
    this.elDistrict = resolveElement(this.options.elDistrict, this.el);
    this.elZipcode = resolveElement(this.options.elZipcode, this.el);

    if (!this.elCounty) {
      this.elCounty = document.createElement("select");
      this.el.appendChild(this.elCounty);
    }
    if (!this.elDistrict) {
      this.elDistrict = document.createElement("select");
      this.el.appendChild(this.elDistrict);
    }
    if (!this.elZipcode && this.options.hasZipcode) {
      this.elZipcode = document.createElement("input");
      this.el.appendChild(this.elZipcode);
    }

    this.elCounty.classList.add(this.options.countyClassName);
    this.elCounty.name = this.options.countyFieldName;
    this.elDistrict.classList.add(this.options.districtClassName);
    this.elDistrict.name = this.options.districtFieldName;

    if (this.elZipcode) {
      this.elZipcode.classList.add(this.options.zipcodeClassName);
      this.elZipcode.name = this.options.zipcodeFieldName;
      this.elZipcode.readOnly = true;
      this.elZipcode.placeholder = this.elZipcode.placeholder || "郵遞區號";
      if (this.options.hiddenZipcode) this.elZipcode.type = "hidden";
    }

    if (this.options.disabled) {
      this.elCounty.disabled = true;
      this.elDistrict.disabled = true;
      if (this.elZipcode) this.elZipcode.disabled = true;
    }
  }

  populateCounties() {
    clearOptions(this.elCounty);
    addOption(this.elCounty, "選擇縣市", "");
    this.data.counties.forEach((county, index) => {
      addOption(this.elCounty, county, county, { index });
    });
  }

  populateDistricts(countyIndex = null) {
    clearOptions(this.elDistrict);
    addOption(this.elDistrict, "選擇區域", "");
    if (countyIndex === null || countyIndex === undefined || countyIndex === "") {
      return;
    }

    const districtData = this.data.districts[Number(countyIndex)];
    if (!districtData) return;

    const [districts, zipcodes] = districtData;
    districts.forEach((district, index) => {
      addOption(this.elDistrict, district, district, {
        zipcode: zipcodes[index] || "",
      });
    });
  }

  bindEvents() {
    this.elCounty.onchange = () => {
      const selected = this.elCounty.selectedOptions[0];
      this.populateDistricts(selected?.dataset.index || "");
      if (this.elZipcode) this.elZipcode.value = "";
    };

    this.elDistrict.onchange = () => {
      const selected = this.elDistrict.selectedOptions[0];
      if (this.elZipcode) this.elZipcode.value = selected?.dataset.zipcode || "";
    };
  }

  setValue(county = null, district = null) {
    if (county) {
      this.elCounty.value = county;
      this.elCounty.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (district) {
      this.elDistrict.value = district;
      this.elDistrict.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return this;
  }

  reset() {
    this.elCounty.selectedIndex = 0;
    this.populateDistricts();
    if (this.elZipcode) this.elZipcode.value = "";
    return this;
  }

  getVersion() {
    console.log(`Your tw-city-selector.js is v${this.VERSION}`);
    return this;
  }
}

if (!globalThis.TwCitySelector) {
  globalThis.TwCitySelector = TwCitySelector;
}
