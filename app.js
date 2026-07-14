(function () {
  "use strict";

  var KEY_FLOORS = "parking:floors";
  var KEY_CURRENT = "parking:current";
  var KEY_HISTORY = "parking:history";
  var DEFAULT_FLOORS = ["B1", "B2", "B3", "B4", "B5"];
  var MAX_HISTORY = 10;

  var els = {
    registerScreen: document.getElementById("registerScreen"),
    statusScreen: document.getElementById("statusScreen"),
    floorGrid: document.getElementById("floorGrid"),
    addDetailToggle: document.getElementById("addDetailToggle"),
    preDetail: document.getElementById("preDetail"),
    preZone: document.getElementById("preZone"),
    preMemo: document.getElementById("preMemo"),

    parkFloor: document.getElementById("parkFloor"),
    parkZone: document.getElementById("parkZone"),
    parkMemo: document.getElementById("parkMemo"),
    parkTime: document.getElementById("parkTime"),
    photoWrap: document.getElementById("photoWrap"),
    parkPhoto: document.getElementById("parkPhoto"),
    photoInput: document.getElementById("photoInput"),
    photoLabelState: document.getElementById("photoLabelState"),
    editBtn: document.getElementById("editBtn"),
    foundBtn: document.getElementById("foundBtn"),

    historyToggle: document.getElementById("historyToggle"),
    historyList: document.getElementById("historyList"),

    settingsBtn: document.getElementById("settingsBtn"),
    settingsModal: document.getElementById("settingsModal"),
    floorListInput: document.getElementById("floorListInput"),
    saveFloorsBtn: document.getElementById("saveFloorsBtn"),
    resetAllBtn: document.getElementById("resetAllBtn"),
    closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  };

  var floors = loadFloors();
  var current = loadCurrent();
  var editing = false;

  function loadFloors() {
    try {
      var raw = localStorage.getItem(KEY_FLOORS);
      if (!raw) return DEFAULT_FLOORS.slice();
      var arr = JSON.parse(raw);
      return Array.isArray(arr) && arr.length ? arr : DEFAULT_FLOORS.slice();
    } catch (e) {
      return DEFAULT_FLOORS.slice();
    }
  }

  function saveFloors(list) {
    floors = list;
    localStorage.setItem(KEY_FLOORS, JSON.stringify(list));
  }

  function loadCurrent() {
    try {
      var raw = localStorage.getItem(KEY_CURRENT);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveCurrent(record) {
    current = record;
    if (record) {
      localStorage.setItem(KEY_CURRENT, JSON.stringify(record));
    } else {
      localStorage.removeItem(KEY_CURRENT);
    }
  }

  function loadHistory() {
    try {
      var raw = localStorage.getItem(KEY_HISTORY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function pushHistory(record) {
    var list = loadHistory();
    list.unshift(record);
    if (list.length > MAX_HISTORY) list = list.slice(0, MAX_HISTORY);
    localStorage.setItem(KEY_HISTORY, JSON.stringify(list));
  }

  function renderFloorGrid() {
    els.floorGrid.innerHTML = "";
    floors.forEach(function (name) {
      var btn = document.createElement("button");
      btn.className = "floor-btn";
      btn.type = "button";
      btn.textContent = name;
      btn.addEventListener("click", function () {
        registerFloor(name);
      });
      els.floorGrid.appendChild(btn);
    });
  }

  function registerFloor(name) {
    var zone = els.preZone.value.trim();
    var memo = els.preMemo.value.trim();
    var timestamp = editing && current ? current.timestamp : Date.now();
    var photo = editing && current ? current.photo : null;

    saveCurrent({
      floor: name,
      zone: zone,
      memo: memo,
      photo: photo,
      timestamp: timestamp,
    });

    editing = false;
    els.preZone.value = "";
    els.preMemo.value = "";
    els.preDetail.classList.add("hidden");
    render();
  }

  function formatRelative(ts) {
    var diffMs = Date.now() - ts;
    var min = Math.floor(diffMs / 60000);
    if (min < 1) return "방금 등록";
    if (min < 60) return min + "분 전 등록";
    var hr = Math.floor(min / 60);
    if (hr < 24) return hr + "시간 전 등록";
    var day = Math.floor(hr / 24);
    return day + "일 전 등록";
  }

  function formatAbsolute(ts) {
    var d = new Date(ts);
    return d.toLocaleString("ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  function render() {
    if (current) {
      els.registerScreen.classList.add("hidden");
      els.statusScreen.classList.remove("hidden");

      els.parkFloor.textContent = current.floor;
      els.parkZone.textContent = current.zone || "";
      els.parkMemo.textContent = current.memo || "";
      els.parkTime.textContent =
        formatRelative(current.timestamp) + " · " + formatAbsolute(current.timestamp);

      if (current.photo) {
        els.parkPhoto.src = current.photo;
        els.photoWrap.classList.remove("hidden");
        els.photoLabelState.textContent = "등록됨";
      } else {
        els.photoWrap.classList.add("hidden");
        els.photoLabelState.textContent = "";
      }
    } else {
      els.statusScreen.classList.add("hidden");
      els.registerScreen.classList.remove("hidden");
    }
    renderHistory();
  }

  function renderHistory() {
    var list = loadHistory();
    els.historyList.innerHTML = "";
    if (!list.length) {
      var empty = document.createElement("li");
      empty.className = "history-empty";
      empty.textContent = "기록이 없습니다";
      els.historyList.appendChild(empty);
      return;
    }
    list.forEach(function (rec) {
      var li = document.createElement("li");
      var left = document.createElement("span");
      left.innerHTML =
        '<span class="floor">' +
        escapeHtml(rec.floor) +
        "</span>" +
        (rec.zone ? " · " + escapeHtml(rec.zone) : "");
      var right = document.createElement("span");
      right.textContent = formatAbsolute(rec.timestamp);
      li.appendChild(left);
      li.appendChild(right);
      els.historyList.appendChild(li);
    });
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function compressPhoto(file, callback) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var maxW = 900;
        var scale = Math.min(1, maxW / img.width);
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        callback(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // --- event bindings ---

  els.addDetailToggle.addEventListener("click", function () {
    els.preDetail.classList.toggle("hidden");
  });

  els.editBtn.addEventListener("click", function () {
    if (!current) return;
    editing = true;
    els.preZone.value = current.zone || "";
    els.preMemo.value = current.memo || "";
    els.preDetail.classList.remove("hidden");
    els.statusScreen.classList.add("hidden");
    els.registerScreen.classList.remove("hidden");
  });

  els.foundBtn.addEventListener("click", function () {
    if (!current) return;
    if (!confirm("차를 찾으셨나요? 현재 주차 기록을 초기화합니다.")) return;
    var record = Object.assign({}, current, { foundAt: Date.now() });
    pushHistory(record);
    saveCurrent(null);
    render();
  });

  els.photoInput.addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file || !current) return;
    compressPhoto(file, function (dataUrl) {
      current.photo = dataUrl;
      saveCurrent(current);
      render();
    });
  });

  els.historyToggle.addEventListener("click", function () {
    var willShow = els.historyList.classList.contains("hidden");
    els.historyList.classList.toggle("hidden");
    els.historyToggle.textContent = willShow ? "최근 기록 숨기기 ▴" : "최근 기록 보기 ▾";
  });

  els.settingsBtn.addEventListener("click", function () {
    els.floorListInput.value = floors.join(",");
    els.settingsModal.classList.remove("hidden");
  });

  els.closeSettingsBtn.addEventListener("click", function () {
    els.settingsModal.classList.add("hidden");
  });

  els.settingsModal.addEventListener("click", function (e) {
    if (e.target === els.settingsModal) els.settingsModal.classList.add("hidden");
  });

  els.saveFloorsBtn.addEventListener("click", function () {
    var list = els.floorListInput.value
      .split(",")
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
    if (!list.length) list = DEFAULT_FLOORS.slice();
    saveFloors(list);
    renderFloorGrid();
    els.settingsModal.classList.add("hidden");
  });

  els.resetAllBtn.addEventListener("click", function () {
    if (!confirm("모든 주차 기록과 설정을 초기화할까요?")) return;
    localStorage.removeItem(KEY_CURRENT);
    localStorage.removeItem(KEY_HISTORY);
    localStorage.removeItem(KEY_FLOORS);
    floors = DEFAULT_FLOORS.slice();
    current = null;
    editing = false;
    renderFloorGrid();
    render();
    els.settingsModal.classList.add("hidden");
  });

  // init
  renderFloorGrid();
  render();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
