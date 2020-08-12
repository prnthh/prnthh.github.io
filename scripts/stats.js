var _data;

function log(data) {
    var child = document.createElement("div");
    child.innerHTML = data;
    child = child.firstChild;

    document.getElementById("logs").appendChild(child);
    document.getElementById("logs").appendChild(document.createElement("br"));
    console.log(data);
}

function addStamp() {
    _data.instances[0].timestamps.push(new Date());
    loadUI();
    updateBlob();
}

function updateBlob() {
    localStorage.setItem("data", JSON.stringify(_data));
}

function createNewBlob(callback) {
    var data = {
        instances: [
            {
                title: "default",
                timestamps: [],
                count: 0,
            }
        ]
    };
    _data = data;
    log("trying to save new blob: " + JSON.stringify(data));
    localStorage.setItem("data", JSON.stringify(_data));

    callback();
}

function clearBlob() {
    createNewBlob(loadUI);
    log("cleared blob");
}

function createTab(instance) {
    document.getElementById("tab").innerHTML = instance.title;
    document.getElementById("dataRows").innerHTML = "";
    instance.timestamps.forEach(stamp => {
        var child = document.createElement("div");
        child.innerHTML = new Date(stamp);
        child = child.firstChild;

        document.getElementById("dataRows").appendChild(child);
        document.getElementById("dataRows").appendChild(document.createElement("br"));
        document.getElementById("dataRows").appendChild(document.createElement("br"));
    });

}

function loadUI() {
    log("loaded data: " + JSON.stringify(_data))
    _data.instances.forEach(instance => {
        createTab(instance);
    });
}

function initialize() {
    try {
        _data = JSON.parse(localStorage.getItem("data"));
        log("loaded json from saved blob:" + JSON.stringify(_data))
    } catch (e) {

    }

    if (_data == null) {
        createNewBlob();
    }

    loadUI();
}

if (typeof (Storage) !== "undefined") {
    log("storage supported!")
    initialize();
} else {
    log("storage not supported :/")
    // Sorry! No Web Storage support..
}