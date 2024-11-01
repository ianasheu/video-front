/* globals */

const useCache = true; /* met en cache les reponses dans localStorage */
const ttl = 3600; /* duree de vie du cache 1h */
const cachePrefix = 'video-api-cache_';
let fromAjax = false;

const limit = 20; /* pour charger tous les resultats qu une recherche, mettre 0 */
let offset = 0, startTime = 0, endTime = 0; ajaxTimeout = 1500;
let isLoading = false, isComplete = (limit>0 ? false : true);

const apiKey = 'video-api-public-key';
const APIroot = "https://www.ianasheu.com/video/api";
let URLpath = "", URLorderfilter = "", URLoffsetfilter = "";


window.onload = function() {

	/* objets de la page */
	let searchform = document.getElementById("searchform");
	searchform.addEventListener('input', () => formChange());
	searchform.addEventListener('submit', (event) => {
		event.preventDefault();
	});
	window.addEventListener('scroll', () => moreResult());

	let deck = document.getElementById("deck");
	let loadsome = document.getElementById("loadsome");
	let loadmore = document.getElementById("loadmore");

	clearCache();
	initCategoryList();
	initWidgetsForm();


	/* form init values */
	window.initkeyword = document.getElementById("keyword").value.trim().replace(/\s+/g, " ");
	window.initcategory = new Array();
	window.initminyearinput = document.getElementById("minyearinput").value;
	window.initmaxyearinput = document.getElementById("maxyearinput").value;
	window.initminratinginput = document.getElementById("minratinginput").value;
	window.initmaxratinginput = document.getElementById("maxratinginput").value;
	window.initorderby = (document.querySelector('input[name="orderby"]:checked') ? document.querySelector('input[name="orderby"]:checked').value : "");

	URLorderfilter = (initorderby ? "orderby="+initorderby : "");
	URLoffsetfilter = (limit>0 ? "limit="+limit+"&offset="+offset : "");

	let previouskeyword = initkeyword;
	let previouscategory = new Array();
	let previousminyearinput = initminyearinput;
	let previousmaxyearinput = initmaxyearinput;
	let previousminratinginput = initminratinginput;
	let previousmaxratinginput = initmaxratinginput;
	let previousorderby = initorderby;


	/* ajax */
	let request = new XMLHttpRequest();
	request.addEventListener('load', () => displayResult(request.responseURL, request.status, request.response, parseInt(request.getResponseHeader("X-Total-Count"))));
	request.addEventListener('abort', () => console.log("Annulation Ajax"));
	request.addEventListener('timeout', () => console.log("Timeout Ajax"));
	request.addEventListener('error', () => console.log("Erreur Ajax"));
	request.timeout = ajaxTimeout;
	request.responseType = "json";


	function initCategoryList() {

		let categorylist = document.getElementById("categorylist");
		let reqCat = new XMLHttpRequest();
		reqCat.addEventListener('load', () => {
			if (reqCat.response) {
				let categories = "";
				let catLign = "";
				reqCat.response.forEach((category) => {
					catLign = 
`						<div><input type="checkbox" id="category${category.tag}" value="${category.id}">&nbsp;<label for="category${category.tag}">${category.tag}</label></div>
`;
					categories += catLign;
				});
				let catsToAdd = document.createElement('template');
				catsToAdd.innerHTML = categories;
				categorylist.appendChild(catsToAdd.content);

				document.querySelectorAll('input[id^="category"]:checked').forEach((chk) => {initcategory.push(parseInt(chk.value))});
				previouscategory = initcategory.slice();

				let categorylistitem = document.querySelectorAll('#categorylist div');
				categorylistitem.forEach((item) => {
					item.addEventListener('click', (event) => {
						if (item!==event.target) return;
						chkbx = event.target.querySelector('input[type="checkbox"]');
						chkbx.click();
						event.stopPropagation();
					}, false);
				});
				
				document.getElementById("resetcategory").addEventListener('click', (event) => {
					document.querySelectorAll('input[id^="category"]:checked').forEach((chk) => {chk.checked = false;});
					searchform.dispatchEvent(new Event('input', { bubbles: true }));
				});
			} else {
				document.querySelector(".categorytitle").style.display = "none";
				document.getElementById("categorylist").style.display = "none";
			}
			getFilters(true);
		});
		reqCat.addEventListener('abort', () => console.log("Annulation Ajax"));
		reqCat.addEventListener('timeout', () => console.log("Timeout Ajax"));
		reqCat.addEventListener('error', () => console.log("Erreur Ajax"));
		reqCat.timeout = ajaxTimeout;
		reqCat.responseType = "json";
		try {
			reqCat.open("GET", APIroot + "/category?orderby=tag", true);
			reqCat.setRequestHeader('x-api-key', apiKey);
			reqCat.send();
		} catch (error) {
			console.log("Catch Ajax");
		}
	}


	function initWidgetsForm() {
		
		let minyearoutput = document.getElementById("minyearoutput");
		let maxyearoutput = document.getElementById("maxyearoutput");
		let minyearinput = document.getElementById("minyearinput");
		let maxyearinput = document.getElementById("maxyearinput");
		minyearoutput.textContent = minyearinput.value;
		minyearinput.addEventListener('input', (event) => {
			minyearoutput.textContent = event.target.value;
			if (minyearinput.value > maxyearinput.value) {
				maxyearoutput.textContent = minyearinput.value;
				maxyearinput.value = minyearinput.value;
			}
		});
		maxyearoutput.textContent = maxyearinput.value;
		maxyearinput.addEventListener('input', (event) => {
			maxyearoutput.textContent = event.target.value;
			if (maxyearinput.value < minyearinput.value) {
				minyearoutput.textContent = maxyearinput.value;
				minyearinput.value = maxyearinput.value;
			}
		});
		
		let minratingoutput = document.getElementById("minratingoutput");
		let maxratingoutput = document.getElementById("maxratingoutput");
		let minratinginput = document.getElementById("minratinginput");
		let maxratinginput = document.getElementById("maxratinginput");
		minratingoutput.textContent = minratinginput.value;
		minratinginput.addEventListener('input', (event) => {
			minratingoutput.textContent = event.target.value;
			if (minratinginput.value > maxratinginput.value) {
				maxratingoutput.textContent = minratinginput.value;
				maxratinginput.value = minratinginput.value;
			}
		});
		maxratingoutput.textContent = maxratinginput.value;
		maxratinginput.addEventListener('input', (event) => {
			maxratingoutput.textContent = event.target.value;
			if (maxratinginput.value < minratinginput.value) {
				minratingoutput.textContent = maxratinginput.value;
				minratinginput.value = maxratinginput.value;
			}
		});
	}


	function formChange() {

		const previousURLpath = URLpath, previousURLorderfilter = URLorderfilter;
		let currentURLpath = "", currentURLorderfilter = "";
		const currentkeyword = document.getElementById("keyword").value.trim().replace(/\s+/g, " ");
		let currentcategory = new Array();
		document.querySelectorAll('input[id^="category"]:checked').forEach((chk) => {currentcategory.push(parseInt(chk.value))});
		const currentminyearinput = document.getElementById("minyearinput").value;
		const currentmaxyearinput = document.getElementById("maxyearinput").value;
		const currentminratinginput = document.getElementById("minratinginput").value;
		const currentmaxratinginput = document.getElementById("maxratinginput").value;
		const currentorderby = (document.querySelector('input[name="orderby"]:checked') ? document.querySelector('input[name="orderby"]:checked').value : "");

		if ((currentkeyword != previouskeyword && currentkeyword != initkeyword) || currentkeyword != initkeyword) {
			const regex = /"([^"]+)"|([^"]+)/g;
			let rewritedkeyword = '';
			let match;
			while ((match = regex.exec(currentkeyword)) !== null) {
				if (match[1]) {
					rewritedkeyword += match[1].split(' ').map(mot => encodeURIComponent(mot)).join('+');
				} else if (match[2]) {
					rewritedkeyword += match[2].split(' ').map(mot => encodeURIComponent(mot)).join('*');
				}
			}
			currentURLpath += "/keyword/*"+rewritedkeyword+"*";
		}
		if ((currentcategory.toString() != previouscategory.toString() && currentcategory.toString() != initcategory.toString()) || currentcategory.toString() != initcategory.toString()) {
			currentURLpath += "/category/"+currentcategory.toString();
		}
		if ((currentminyearinput != previousminyearinput && currentminyearinput != initminyearinput) || currentminyearinput != initminyearinput) {
			currentURLpath += "/minyear/"+currentminyearinput;
		}
		if ((currentmaxyearinput != previousmaxyearinput && currentmaxyearinput != initmaxyearinput) || currentmaxyearinput != initmaxyearinput) {
			currentURLpath += "/maxyear/"+currentmaxyearinput;
		}
		if ((currentminratinginput != previousminratinginput && currentminratinginput != initminratinginput) || currentminratinginput != initminratinginput) {
			currentURLpath += "/minrating/"+currentminratinginput;
		}
		if ((currentmaxratinginput != previousmaxratinginput && currentmaxratinginput != initmaxratinginput) || currentmaxratinginput != initmaxratinginput) {
			currentURLpath += "/maxrating/"+currentmaxratinginput;
		}
		currentURLorderfilter = (currentorderby ? "orderby="+currentorderby : "");

		previouskeyword = currentkeyword;
		previouscategory = currentcategory.slice();
		previousminyearinput = currentminyearinput;
		previousmaxyearinput = currentmaxyearinput;
		previousminratinginput = currentminratinginput;
		previousmaxratinginput = currentmaxratinginput;
		previousorderby = currentorderby;

		if ((currentURLpath != previousURLpath) || (currentURLorderfilter != previousURLorderfilter)) {
			deck.innerHTML = "";
			loadsome.innerHTML = "";
			if (limit > 0) {
				offset = 0;
				URLoffsetfilter = "limit="+limit+"&offset="+offset;
				isComplete = false;
			}
			URLpath = currentURLpath;
			URLorderfilter = currentURLorderfilter;
			
			if (URLpath != "") {
				URL = APIroot + '/search' + URLpath +
					(URLorderfilter || URLoffsetfilter ? "?" : "") +
					(URLorderfilter ? URLorderfilter : "") +
					(URLorderfilter && URLoffsetfilter ? "&" : "") +
					(URLoffsetfilter ? URLoffsetfilter : "");
				getJSON(URL);
			}
		}
	}


	window.moreResult = function(forced) {

		if (!isComplete) {
			if (((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 700) || forced) && !isLoading) {
				offset += limit;
				URLoffsetfilter = "limit="+limit+"&offset="+offset;
				URL = APIroot + '/search' + URLpath +
					(URLorderfilter || URLoffsetfilter ? "?" : "") +
					(URLorderfilter ? URLorderfilter : "") +
					(URLorderfilter && URLoffsetfilter ? "&" : "") +
					(URLoffsetfilter ? URLoffsetfilter : "");
				getJSON(URL);
			}
		}
	}


	function getJSON(URL) {

		if (URL) {
			isLoading = true;
			if (useCache) {
				getFromCache(URL);
			} else {
				getFromAjax(URL);
			}
		}
	}


	function getFromCache(URL) {

		if (URL) {
			cache = window.localStorage.getItem(cachePrefix+stringToHash(URL));
			if (cache) {
				cache = JSON.parse(cache);
				const now = new Date();
				const nowSec = Math.round(now.getTime()/1000);
				
				if (cache.datetime + ttl > nowSec) {
					fromAjax = false;
					displayResult(URL, cache.code, cache.response, cache.total);
				} else {
					window.localStorage.removeItem(cachePrefix+stringToHash(URL));
					getFromAjax(URL);
				}
			} else {
				getFromAjax(URL);
			}	
		}
	}


	function getFromAjax(URL) {

		if (URL) {
			fromAjax = true;
			if (offset > 0) {
				loadmore.innerHTML = "... Chargement ...";
			} else {
				loadsome.innerHTML = "... Chargement ...";
			}
			startTime = performance.now()/1000;
			try {
				request.open("GET", URL, true);
				request.setRequestHeader('x-api-key', apiKey);
				request.send();
			} catch (error) {
				console.log("Catch Ajax");
			}
		}
	}


	function displayResult(URL, httpCode, listResult, total) {

		if (httpCode != 200) {
			if (offset == 0) {
				loadsome.innerHTML = "<b>0&nbsp;films</>";
			}
			loadmore.innerHTML = "";
			isLoading = false;
			isComplete = true;
		} else {
			if (listResult) {
				let newCards = "";
				let cardTemplate = "";
				listResult.forEach((movie) => {

					movie.categorytagtitle = "";
					movie.category.forEach((cat) => { movie.categorytagtitle += `${cat.tag}, `; });
					movie.categorytagtitle = movie.categorytagtitle.slice(0, -2);
					movie.categorysearchtag = "";
					movie.category.forEach((cat) => { movie.categorysearchtag += `<span onclick="setForm(null, '${cat.id}', null, null, null, null, 'title')">${cat.tag}</span>, `; });
					movie.categorysearchtag = movie.categorysearchtag.slice(0, -2);
					movie.directorname = "";
					movie.director.forEach((dir) => { movie.directorname += (dir.name!='' ? `${dir.name}-` : ""); });
					movie.directorname = movie.directorname.slice(0, -1);
					movie.directornamecountry = "";
					movie.director.forEach((dnc) => { 
						movie.directornamecountry += (dnc.name!='' ? `<span onclick="setForm('${dnc.name}', null, null, null, null, null, 'yearasc')">${dnc.name}</span>` : "");
						movie.directornamecountry += (dnc.country ? `<img class="flag" src="https://www.ianasheu.com/video/flags/${(dnc.country ? dnc.country.toLowerCase() : "null")}.svg" alt="flag" title="${dnc.state}"> - ` : " - ");
					});
					movie.directornamecountry = movie.directornamecountry.slice(0, -3);

					cardTemplate = 
`			<div class="card">
				<img class="poster" src="https://www.ianasheu.com/video/affiches/${movie.poster}" alt="poster" title="${movie.title} (${(movie.directorname ? movie.directorname+"-" : "")}${movie.year})">
				<div class="cardbody">
					<div class="bodylign1">
						<h3 class="title" title="${movie.title}">${movie.title}</h3>
						<div><a href="https://www.allocine.fr/film/fichefilm_gen_cfilm=${movie.allocine}.html" target="_blank" tabindex="-1"><img class="extlink" src="./assets/img/external-link.svg" alt="allocine" title="allocine"></a></div>
					</div>
					<div class="bodylign2">
						<div class="category" title="${movie.categorytagtitle}">${movie.categorysearchtag}</div>
						<div class="rating"><img class="star" src="./assets/img/half-star.svg" alt="rating" title="${movie.rating}">&nbsp;${movie.rating}</div>
					</div>
					<div class="bodylign3">
						<div class="director" title="${movie.directorname}">${movie.directornamecountry}</div>
						<div class="year">${movie.year}</div>
					</div>
				</div>
			</div>
`;
					newCards += cardTemplate;
				});
				let cardsToAdd = document.createElement('template');
				cardsToAdd.innerHTML = newCards;
				deck.appendChild(cardsToAdd.content);
			}

			isLoading = false;
			if (limit > 0) {
				if (offset+limit >= total ) {
					isComplete = true;
				} else {
					isComplete = false;
				}
			}
			if (offset > 0) {
				loadmore.innerHTML = "";
			} else {
				loadsome.innerHTML = "<b>"+total+"&nbsp;films</>";
				let root = (window.location.href).split('?')[0];
				window.history.replaceState(null, '', root);
			}
		}

		if (useCache && fromAjax) {
			const now = new Date();
			const nowSec = Math.round(now.getTime()/1000);
			window.localStorage.setItem(cachePrefix+stringToHash(URL), JSON.stringify({
				"URL": URL,
				"code": httpCode,
				"response": listResult,
				"total": total,
				"datetime": nowSec
			}
			));
		}

		if (fromAjax) {
			endTime = performance.now()/1000;
			fromAjax = false;
		}
	}

}; /* end window.onload */


function clearCache(forced) {

	const now = new Date();
	const nowSec = Math.round(now.getTime()/1000);
	let total = 0;
	for (var i = window.localStorage.length-1; i>=0; i--) {
		try {
			cache = JSON.parse(window.localStorage.getItem(window.localStorage.key(i)));
		} catch (e) {
			continue;
		}
		if (cache.hasOwnProperty("datetime")) {
			if ((parseInt(JSON.parse(window.localStorage.getItem(window.localStorage.key(i))).datetime) + ttl < nowSec) || forced) {
				window.localStorage.removeItem(window.localStorage.key(i));
				total++;
			}
		}
	}
}


function getFilters(clear) {

	const filters = new URLSearchParams(window.location.search);
	let newkeyword = null, newcategory = null,
		newminyearinput = null, newmaxyearinput = null,
		newminratinginput = null, newmaxratinginput = null,
		neworderby = null;

	filters.forEach((value, key) => {
		switch(key) {
			case 'keyword':
				newkeyword = value.replaceAll("*", " ").trim();
				break;
			case 'category':
				newcategory = value;
				break;
			case 'minyear':
				newminyearinput = value;
				break;
			case 'maxyear':
				newmaxyearinput = value;
				break;
			case 'minrating':
				newminratinginput = value;
				break;
			case 'maxrating':
				newmaxratinginput = value;
				break;
			case 'orderby':
				neworderby = value;
				break;
		}
	});

	setForm(newkeyword, newcategory, newminyearinput, newmaxyearinput, newminratinginput, newmaxratinginput, neworderby);
	if (clear) {
		let root = (window.location.href).split('?')[0];
		window.history.replaceState(null, '', root);
	}
}


function setForm(newkeyword, newcategory, newminyearinput, newmaxyearinput, newminratinginput, newmaxratinginput, neworderby) {

	document.getElementById("keyword").value = (newkeyword == undefined ? initkeyword : newkeyword);

	if (newcategory == undefined) {
		document.querySelectorAll('input[id^="category"]:checked').forEach((chk) => {chk.checked = false;});
		initcategory.forEach((id) => {document.querySelector('input[id^="category"][value="'+id+'"]').checked = true;});
	} else {
		document.querySelectorAll('input[id^="category"]:checked').forEach((chk) => {chk.checked = false;});
		newcategory.split(',').forEach((id) => {document.querySelector('input[id^="category"][value="'+id+'"]').checked = true;});
	}

	newminyearinput = (newminyearinput == undefined ? initminyearinput : newminyearinput);
	newmaxyearinput = (newmaxyearinput == undefined ? initmaxyearinput : newmaxyearinput);
	newminratinginput = (newminratinginput == undefined ? initminratinginput : newminratinginput);
	newmaxratinginput = (newmaxratinginput == undefined ? initmaxratinginput : newmaxratinginput);

	minyearinput.value = newminyearinput;
	maxyearinput.value = newmaxyearinput;
	minratinginput.value = newminratinginput;
	maxratinginput.value = newmaxratinginput;
	minyearoutput.textContent = newminyearinput;
	maxyearoutput.textContent = newmaxyearinput;
	minratingoutput.textContent = newminratinginput;
	maxratingoutput.textContent = newmaxratinginput;

	document.querySelector('input[name="orderby"][value="'+(neworderby == undefined ? initorderby : neworderby)+'"]').checked = true;
	searchform.dispatchEvent(new Event('input', { bubbles: true }));
}


function stringToHash(string) {

	let hash = 0;
	if (string.length == 0) return hash;
	for (i = 0; i<string.length; i++) {
		charCode = string.charCodeAt(i);
		hash = ((hash << 5) - hash) + charCode;
		hash |= hash;
	}
	return hash;
}


function uuid() {

	return '00000000-00000000'.replace(/[0]/g, function(c) {
		var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}
