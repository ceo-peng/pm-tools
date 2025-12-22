// assets/api.js
/* eslint-disable no-console */
(function () {
  const Api = {};
  let _base = "";
  let _token = "";

  function setBaseUrl(url) { _base = (url || "").replace(/\/+$/, ""); }
  function setIdToken(idToken) { _token = idToken || ""; }

  function headers(extra) {
    const h = Object.assign({ "Content-Type": "application/json" }, extra || {});
    if (_token) h["Authorization"] = `Bearer ${_token}`;
    return h;
  }

  async function request(path, opts) {
    const url = `${_base}${path.startsWith("/") ? "" : "/"}${path}`;
    const res = await fetch(url, opts);
    let payload = null;
    const ctype = res.headers.get("content-type") || "";
    if (ctype.includes("application/json")) {
      payload = await res.json();
    } else {
      const text = await res.text();
      payload = { ok: res.ok, data: text };
    }
    if (!res.ok) {
      const err = payload && payload.error ? payload.error : { message: "Request failed" };
      return { ok: false, status: res.status, error: err, raw: payload };
    }
    return payload;
  }

  Api.init = function init({ baseUrl, idToken }) {
    setBaseUrl(baseUrl);
    setIdToken(idToken);
  };

  Api.setIdToken = setIdToken;

  Api.getBootstrap = async function getBootstrap() {
    return request("/api/bootstrap", { method: "GET", headers: headers() });
  };

  Api.updateLP = async function updateLP(payload) {
    return request("/api/lp/update", { method: "POST", headers: headers(), body: JSON.stringify(payload) });
  };

  Api.updateDeliverable = async function updateDeliverable(payload) {
    return request("/api/deliverable/update", { method: "POST", headers: headers(), body: JSON.stringify(payload) });
  };

  Api.addDocument = async function addDocument(payload) {
    return request("/api/document/add", { method: "POST", headers: headers(), body: JSON.stringify(payload) });
  };

  Api.upsertRequirementItem = async function upsertRequirementItem(payload) {
    return request("/api/requirement/itemUpsert", { method: "POST", headers: headers(), body: JSON.stringify(payload) });
  };

  Api.setActiveRequirementVersion = async function setActiveRequirementVersion(payload) {
    return request("/api/requirement/setActive", { method: "POST", headers: headers(), body: JSON.stringify(payload) });
  };

  Api.updateMilestone = async function updateMilestone(payload) {
    return request("/api/milestone/update", { method: "POST", headers: headers(), body: JSON.stringify(payload) });
  };

  Api.updateLabels = async function updateLabels(payload) {
    return request("/api/labels/update", { method: "POST", headers: headers(), body: JSON.stringify(payload) });
  };

  // Expose globally
  window.AppApi = Api;
})();
