var _data;
var _activeTab;

function getDateDiff(date, n) {
    return new Date(date.getTime() - (n * 24 * 60 * 60 * 1000));
}

function log(data) {
    var div = document.getElementById('logs');
    div.innerHTML += "<br />";
    div.innerHTML += data;
    console.log(data);
}

// Blob manipulation

function createNewBlob(callback) {
    var data = {
        instances: {
            "default": {
                timestamps: [],
                count: 0,
            }
        }
    };
    _data = data;
    _activeTab = Object.keys(data.instances)[0];
    log("creating new blob");
    localStorage.setItem("data", JSON.stringify(_data));

    callback && callback();
}

function clearBlob() {
    createNewBlob(loadUI);
    log("cleared blob");
}

function updateBlob() {
    localStorage.setItem("data", JSON.stringify(_data));
    log("saved latest blob")
}

// UI Management

function loadUI() {
    log("rendering data: " + JSON.stringify(_data))
    // _data.instances.forEach(instance => {
    //     createTab(instance);
    // });
    document.getElementById("title").innerHTML = "";
    for (var i = 0; i < Object.keys(_data.instances).length; i++) {
        var tabInstance = Object.keys(_data.instances)[i];
        createTab(tabInstance);
    }
    createList(_activeTab)
}

function createTab(tabInstance) {
    var tabHeader = document.getElementById("title");
    tabHeader.innerHTML += ("<div style='background-color:" + (tabInstance == _activeTab ? "grey" : "red") + ";'>" +
        _activeTab +
        "</div>");
}

function createList(instance) {
    var tabList = document.getElementById("list");
    tabList.innerHTML = "";
    var instanceData = _data.instances[instance];

    var timeStamps = instanceData.timestamps;

    for (var i = 0; i < timeStamps.length; i++) {
        tabList.innerHTML += ("<div style=''>" +
            new Date(timeStamps[i]) +
            "</div>");
    }

    renderAverages(instance);

}

function renderAverages(instance) {
    var oneDay = document.getElementById("oneday");
    oneDay.innerHTML = "";

    var sevenDay = document.getElementById("sevenday");
    sevenDay.innerHTML = "";

    var instanceData = _data.instances[instance];
    var timeStamps = instanceData.timestamps;
    var todayEnd = new Date();
    todayEnd.setHours(24, 0, 0, 0);

    var weekAgo = getDateDiff(new Date(), 7);
    sevenDay.innerHTML = getIndexAfterTimestamp(timeStamps, weekAgo)
    var dayAgo = getDateDiff(new Date(), 1);
    oneDay.innerHTML = getIndexAfterTimestamp(timeStamps, dayAgo)


}

function getIndexAfterTimestamp(timeStamps, stamp) {
    var len = 0;
    console.log(stamp, timeStamps[timeStamps.length - len - 1])
    while (stamp < new Date(timeStamps[timeStamps.length - len - 1]) && timeStamps.length != len) {
        len++;
    }

    return len;
}

// User actions

function addStamp() {
    _data.instances[_activeTab].timestamps.push(new Date());
    _data.instances[_activeTab].count++;
    updateBlob();
    loadUI();
}

function initialize() {
    try {
        _data = JSON.parse(localStorage.getItem("data"));
        log("loaded json from saved blob");
        _activeTab = Object.keys(_data.instances)[0];
    } catch (e) {

    }

    if (_data == null) {
        createNewBlob();
    }

    loadUI();
}