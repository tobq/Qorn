"use strict";

var yin = document.getElementById("yin"),
	over = document.getElementById("over"),
	player = document.getElementById("player"),
	pp = document.getElementById("pp"),
	title = document.getElementById("title"),
	add = document.getElementById("add"),
	rList = document.getElementById("results"),
	rcon = document.getElementById("rcon"),
	closercon = document.getElementById("closercon"),
	fs = document.getElementById("fs"),
	elapsed = document.getElementById("elapsed"),
	timeline = document.getElementById("timeline"),
	hoverTimeout,
	mmoved = 0,
	fetching = 0;

if (window.location.hash) {
	player.src = "/play/" + window.location.hash.slice(1);
	player.load();
	player.play();
}

document.onmousemove = function () {
	mmoved = 20;
}

setInterval(function () {
	elapsed.style.width = 100 * player.currentTime / player.duration + "%";
	var mm = mmoved;
	if (mm === 20) unhide(over);
	if (mm > 0) mmoved--;
	if (over.className !== "enabled" && mm === 0) hide(over);
}, 100);

over.onsubmit = function () {
	clearTimeout(hoverTimeout);
	if (over.className === "enabled" && !fetching) {
		var q;
		if (!yin.value ||
			yin.value === "No videos found" ||
			yin.value === "Video unsupported") yin.value = "Top videos";
		if (yin.value === "Top videos") q = "*";
		else q = yin.value;

		search(q, function (results) {
			if (results.length) {
				while (rList.firstChild) rList.removeChild(rList.firstChild);
				for (var i = 0; i < results.length; i++) {
					var el = document.createElement("div");
					el.innerText = results[i][1].replace(/\d+(x|\*)\d+|\w*(hd|264|h26|web|cd|dvd|vid|rip)\w*|_|\.|x\d+|\[.*\]/ig, " ");
					el.id = results[i][2];
					el.onclick = start;
					rList.appendChild(el);
				}
				unhide(rcon, 200);
			} else {
				yin.value = "No videos found";
				hide(rcon, 200);
			}
		});
	}
	else over.className = "enabled";
	return false;
}

over.onclick = player.onplay = function (e) {
	if (!e.target || e.target == over) {
		over.className = "";
		pp.onclick();
	}
}

function start(e) {
	//if (fetching) return;
	//fetching++;
	//add.className = "loading";
	//Post("start", { i: e.target.id }, function (res) {
	//    if (res.status === 200) {
	player.src = "/play/" + e.target.id;
	player.load();
	player.play();
	window.location.hash = e.target.id;
	if (e.target.innerText) title.innerText = e.target.innerText[0].toUpperCase() + e.target.innerText.slice(1);
	over.className = "";
	hide(rcon);
}
//else yin.value = "Video unsupported";
//fetching--;
//add.className = "";
//});
//}


function Post(url, data, cb) {
	return Ajax("POST", url, data, cb)
};

function Get(url, cb) {
	return Ajax("GET", url, undefined, cb)
};

function Ajax(method, url, data, cb) {
	function response() {
		if (xmlHttp.readyState === 4) {
			try {
				xmlHttp.response = JSON.parse(xmlHttp.responseText);
			}
			catch (err) {
			}
			return xmlHttp;
		}
	}

	var xmlHttp = new XMLHttpRequest();
	xmlHttp.open(method, url, !!cb);
	if (data) xmlHttp.setRequestHeader("Content-Type", "application/json");
	if (cb) xmlHttp.onload = function () {
		var res = response();
		if (res) cb(res);
	};
	xmlHttp.send(JSON.stringify(data));
	return response();
}

pp.onclick = function () {
	mmoved = 20;
	player[player.paused ? "play" : "pause"]();
}

player.onplay = function () {
	pp.className = ""
}
player.onpause = function () {
	pp.className = "paused"
}

function search(q, cb, trusted, host, proxy) {
	fetching++
	add.className = "loading";
	return Get((proxy || "https://cors-anywhere.herokuapp.com/") + (host || "https://thepiratebay.org") + "/search/" + q + "/0/99/200", function (res) {
		var results = [],
			raw = res.responseText.split('<a href="/torrent/');

		for (var i = 1; i < raw.length; i++) {
			if (trusted && raw[i].indexOf('title="VIP"') === -1) continue;
			var data = [],
				magnet = "",
				val = "",
				Char = "", j = 0;
			while ((Char = raw[i][j++]) !== '"' && j < raw[i].length) {
				if (Char === "/") {
					data.push(val);
					val = "";
				}
				else val += Char;
			}
			data.push(val);

			var mag = raw[i].split('"magnet:?xt=urn:btih:')[1];
			j = 0;
			while ((Char = mag[j++]) != '&' && j < mag.length) magnet += Char;
			data.push(decodeURIComponent(magnet));
			results.push(data)
		}

		fetching--
		add.className = "";
		if (cb) cb(results);
	})
}
function hide(el, dur) {
	dur = dur || 300;
	el.style.transitionDuration = dur + "ms";
	el.style.opacity = 0;
	setTimeout(function () {
		el.style.display = "none";
	}, dur);
}

function unhide(el, dur, display) {
	display = display || "block"
	el.style.display = display;
	el.style.transitionDuration = (dur || 300) + "ms";
	el.offsetWidth;
	el.style.opacity = 1;
}

closercon.onclick = function () {
	hide(rcon, 200);
};


fs.onclick = function () {
	function fb() {
		if (window.ActiveXObject !== undefined) {
			var wscript = new ActiveXObject("WScript.Shell");
			if (wscript) wscript.SendKeys("{F11}");
		}
	}

	if (document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
		if (document.exitFullscreen) document.exitFullscreen();
		else if (document.msExitFullscreen) document.msExitFullscreen();
		else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
		else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
		else fb();
	} else {
		if (document.body.requestFullscreen) document.body.requestFullscreen();
		else if (document.body.msRequestFullscreen) document.body.msRequestFullscreen();
		else if (document.body.mozRequestFullScreen) document.body.mozRequestFullScreen();
		else if (document.body.webkitRequestFullscreen) document.body.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
		else fb();
	}
};

document.onfullscreenchange = document.onwebkitfullscreenchange = document.onmozfullscreenchange = document.onmsfullscreenchange = function () {
	fs.className = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement ?
		"fs" : "";
};
