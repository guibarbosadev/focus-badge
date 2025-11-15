const IDs = {
  form: "optionsForm",
  inputSite: "site",
};

const LocalStorageKeys = {
  siteList: "siteList",
};

function onSubmit(event) {
  event.preventDefault();
  const site = document.getElementById(IDs.inputSite).value;
  const siteList = JSON.parse(
    browser.storage.local.get(LocalStorageKeys.siteList) ?? "[]"
  );

  siteList.push(site);
  browser.storage.local.set("siteList", JSON.stringify(siteList));
  console.log(siteList);
}

document.getElementById(IDs.form).addEventListener("submit", onSubmit);
