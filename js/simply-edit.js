/*
	Vedor editor - Simply edit the Web

	Written by Yvo Brevoort
	Copyright Muze 2015, all rights reserved.
*/
(function() {
	if (window.editor) {
		return;
	}
	var apiKey = document.querySelector("[data-api-key]").getAttribute("data-api-key");
	
	var editor = {
	        baseURL : "http://se-cdn.muze.nl/" + apiKey + "/simply-edit/",
		data : {
			apply : function(data, target) {
				if (typeof editor.data.originalBody === "undefined") {
					editor.data.originalBody = document.body.cloneNode(true);
				}

				var dataFields = target.querySelectorAll("[data-vedor-field]");
				for (var i=0; i<dataFields.length; i++) {
					var dataName = dataFields[i].getAttribute("data-vedor-field");
					var dataPath = dataFields[i].getAttribute("data-vedor-path") ? dataFields[i].getAttribute("data-vedor-path") : location.pathname;

					if (data[dataPath] && data[dataPath][dataName]) {
						editor.field.set(dataFields[i], data[dataPath][dataName]);
					}
				}

				editor.data.list.init(data, target);

				if ("removeEventListener" in document) {
					document.removeEventListener("DOMContentLoaded", preventDOMContentLoaded, true);
					window.removeEventListener("load", preventDOMContentLoaded, true);
				}

				var fireEvent = function(evtname, target) {
					var event; // The custom event that will be created
					if (document.createEvent) {
						event = document.createEvent("HTMLEvents");
						event.initEvent(evtname, true, true);
					} else {
						event = document.createEventObject();
						event.eventType = evtname;
					}

					event.eventName = evtname;

					if (document.createEvent) {
						target.dispatchEvent(event);
					} else {
						// target.fireEvent("on" + event.eventType, event);
					}
				};

				
				fireEvent("DOMContentLoaded", document);
				window.setTimeout(function() {
					fireEvent("load", window);
				}, 100);

				if (typeof jQuery !== "undefined") {
					jQuery.holdReady(false);
				}
			},
			get : function(target) {
				var i, j;
				var data = {};
				var dataName, dataPath, dataFields, dataLists, listItems;

				var addListData = function(list) {
					if (list.getAttribute("data-vedor-stashed")) {
						return;
					}
					dataName = list.getAttribute("data-vedor-list");
					dataPath = list.getAttribute("data-vedor-path") ? list.getAttribute("data-vedor-path") : location.pathname;

					if (!data[dataPath]) {
						data[dataPath] = {};
					}

					if (!data[dataPath][dataName]) {
						data[dataPath][dataName] = [];
					}

					listItems = list.querySelectorAll("[data-vedor-list-item]");
					var counter = 0;
					for (j=0; j<listItems.length; j++) {
						if (listItems[j].parentNode != list) {
							continue;
						}

						if (!data[dataPath][dataName][counter]) {
							data[dataPath][dataName][counter] = {};
						}
						var subData = editor.data.get(listItems[j]);
						for (var subPath in subData) {
							if (subPath != dataPath) {
								console.log("Notice: use of data-vedor-path in subitems is not permitted, translated " + subPath + " to " + dataPath);
							}
							data[dataPath][dataName][counter] = subData[subPath];
						}
						// data[dataPath][dataName][counter] = editor.data.get(listItems[j]);
						if (listItems[j].getAttribute("data-vedor-template")) {
							data[dataPath][dataName][counter]['data-vedor-template'] = listItems[j].getAttribute("data-vedor-template");						}
						counter++;
					}
					list.setAttribute("data-vedor-stashed", 1);
				};

				var addData = function(field) {
					if (field.getAttribute("data-vedor-stashed")) {
						return;
					}

					dataName = field.getAttribute("data-vedor-field");
					dataPath = field.getAttribute("data-vedor-path") ? field.getAttribute("data-vedor-path") : location.pathname;

					if (!data[dataPath]) {
						data[dataPath] = {};
					}

					data[dataPath][dataName] = editor.field.get(field);
					field.setAttribute("data-vedor-stashed", 1);
				};

				dataLists = target.querySelectorAll("[data-vedor-list]");
				for (i=0; i<dataLists.length; i++) {
					addListData(dataLists[i]);
				}
				if (target.nodeType == 1 && target.getAttribute("data-vedor-list")) {
					addListData(target);
				}

				dataFields = target.querySelectorAll("[data-vedor-field]");
				for (i=0; i<dataFields.length; i++) {
					addData(dataFields[i]);
				}
				if (target.nodeType == 1 && target.getAttribute("data-vedor-field")) {
					addData(target);
				}

				return data;
			},
			merge : function(data, newData) {
				// target, src) {
				for (var path in newData) {
					if (typeof data[path] === "undefined") {
						data[path] = newData[path];
					} else {
						for (var field in newData[path]) {
							data[path][field] = newData[path][field];
						}
					}
				}
				return data;
			},
			stash : function() {
				var data = {};
				var dataName, dataPath, dataFields;
				var i, j, k, subKey;

				if (localStorage.data) {
					data = JSON.parse(localStorage.data);
				}

				var stashedFields = document.querySelectorAll("[data-vedor-stashed]");
				for (i=0; i<stashedFields.length; i++) {
					stashedFields[i].removeAttribute("data-vedor-stashed");
				}

				var newData = editor.data.get(document);
				data = editor.data.merge(data, newData);
	
				localStorage.data = JSON.stringify(data, null, "\t");
			},
			save : function() {
				if (editor.storage.connect()) {
					editor.data.stash();
					if (editor.actions['vedor-beforesave']) {
						editor.actions['vedor-beforesave']();
					}
					editor.storage.save(localStorage.data, function() {
						if (editor.actions['vedor-aftersave']) {
							editor.actions['vedor-aftersave']();
						} else {
							alert("Saved!");
						}
					});
				} 
			},
			load : function() {
				document.body.style.opacity = 0;

				editor.storage.load(function(data) {
					document.body.style.opacity = 1;
					localStorage.data = data;
					editor.currentData = JSON.parse(data);
					editor.data.apply(editor.currentData, document);

					var checkEdit = function() {
						if (document.location.hash == "#vedor-edit") {
							if (editor.storage.connect()) {
								editor.editmode.init();
								var checkHope = function() {
									if (typeof hope !== "undefined") {
										editor.editmode.editable(document);
									} else {
										window.setTimeout(checkHope, 100);
									}
								};
								checkHope();
							}
						}
					};

					if ("addEventListener" in window) {
						window.addEventListener("hashchange", checkEdit);
					}
					checkEdit();
				});
			},
			list : {
				keyDownHandler : function(evt) {
					if(evt.ctrlKey && evt.altKey && evt.keyCode == 65) { // ctrl-alt-A
						if (typeof editor.plugins.list.add !== "undefined") {
							editor.plugins.list.add(this);
							evt.preventDefault();
						}
					}
				},
				init : function(data, target) {
					var dataName, dataPath;
					var dataLists = target.querySelectorAll("[data-vedor-list]");
					for (var i=0; i<dataLists.length; i++) {
						editor.data.list.parseTemplates(dataLists[i]);
						dataName = dataLists[i].getAttribute("data-vedor-list");
						dataPath = dataLists[i].getAttribute("data-vedor-path") ? dataLists[i].getAttribute("data-vedor-path") : location.pathname;
						if (data[dataPath] && data[dataPath][dataName]) {
							editor.data.list.applyTemplates(dataLists[i], data[dataPath][dataName]);
						}

						var hasChild = false;
						for (var j=0; j<dataLists[i].childNodes.length; j++) {
							if (
								dataLists[i].childNodes[j].nodeType == 1 && 
								dataLists[i].childNodes[j].getAttribute("data-vedor-list-item")
							) {
								hasChild = true;
							}
						}
						if (!hasChild) {
							if ("classList" in dataLists[i]) {
								dataLists[i].classList.add("vedor-empty");
							} else {
								dataLists[i].className += " vedor-empty";
							}
						}
						if ("addEventListener" in dataLists[i]) {
							dataLists[i].addEventListener("keydown", editor.data.list.keyDownHandler);
						}
					}
				},
				fixFirstElementChild : function(clone) {
					if (!("firstElementChild" in clone)) {
						for (var l=0; l<clone.childNodes.length; l++) {
							if (clone.childNodes[l].nodeType == 1) {
								clone.firstElementChild = clone.childNodes[l];
							}
						}
					}
				},
				parseTemplates : function(list) {
					var dataName = list.getAttribute("data-vedor-list");
					var dataPath = list.getAttribute("data-vedor-path") ? list.getAttribute("data-vedor-path") : location.pathname;

//					var templates = list.querySelectorAll("template");
					var templates = list.getElementsByTagName("template");

					if (typeof list.templates === "undefined") {
						list.templates = {};
					}
					for (var t=0; t<templates.length; t++) {
						var templateName = templates[t].getAttribute("data-vedor-template") ? templates[t].getAttribute("data-vedor-template") : t;

//						list.templates[templateName] = templates[t].cloneNode(true);
						list.templates[templateName] = templates[t];
						if (!("content" in list.templates[templateName])) {
							var fragment = document.createDocumentFragment();
							var fragmentNode = document.createElement("FRAGMENT");

							content  = list.templates[templateName].children;
							for (j = 0; j < content.length; j++) {
								fragmentNode.appendChild(content[j].cloneNode(true));
								fragment.appendChild(content[j]);
							}
							list.templates[templateName].content = fragment;
							list.templates[templateName].contentNode = fragmentNode;
						}
					}
					while (templates.length) {
						templates[0].parentNode.removeChild(templates[0]);
					}
				},
				applyTemplates : function(list, listData) {
					var e,j,k,l;
					var dataName;
					var t, counter;

					var initFields = function(clone) {

						var handleFields = function(elm) {
							dataName = elm.getAttribute("data-vedor-field");
							if (listData[j][dataName]) {
								editor.field.set(elm, listData[j][dataName]);
							}
						};

						var handleLists = function(elm) {
							editor.data.list.parseTemplates(elm);
							dataName = elm.getAttribute("data-vedor-list");
							if (listData[j][dataName]) {
								editor.data.list.applyTemplates(elm, listData[j][dataName]);
							}

							var hasChild = false;
							for (var m=0; m<elm.childNodes.length; m++) {
								if (
									elm.childNodes[m].nodeType == 1 &&
									elm.childNodes[m].getAttribute("data-vedor-list-item")
								) {
									hasChild = true;
								}
							}
							if (!hasChild) {
								if ("classList" in elm) {
									elm.classList.add("vedor-empty");
								} else {
									elm.className += " vedor-empty";
								}
							}
						};

						var dataName;
						var dataFields = clone.querySelectorAll("[data-vedor-field]");
						for (k=0; k<dataFields.length; k++) {
							handleFields(dataFields[k]);
						}
						if (clone.nodeType == 1 && clone.getAttribute("data-vedor-field")) {
							handleFields(clone);
						}

						var dataLists = clone.querySelectorAll("[data-vedor-list]");
						for (k=0; k<dataLists.length; k++) {
							handleLists(dataLists[k]);
						}
						if (clone.nodeType == 1 && clone.getAttribute("data-vedor-list")) {
							handleLists(clone);
						}
					};

					for (j=0; j<listData.length; j++) {
						var requestedTemplate = listData[j]["data-vedor-template"];

						if (!list.templates[requestedTemplate]) {
							for (t in list.templates) {
								requestedTemplate = t;
								break;
							}
							// requestedTemplate = Object.keys(list.templates)[0];
						}

						var clone;
						if ("importNode" in document) {
							clone = document.importNode(list.templates[requestedTemplate].content, true);

							// Grr... android browser imports the nodes, except the contents of subtemplates. Find them and put them back where they belong.
							var originalTemplates = list.templates[requestedTemplate].content.querySelectorAll("template");
							var importedTemplates = clone.querySelectorAll("template");

							for (var i=0; i<importedTemplates.length; i++) {
								importedTemplates[i].innerHTML = originalTemplates[i].innerHTML;
							}

							initFields(clone);
		
							editor.data.list.fixFirstElementChild(clone);

							counter = 0;
							for (t in list.templates) {
								counter++;
							}
							
							if (counter > 1) {
								clone.firstElementChild.setAttribute("data-vedor-template", requestedTemplate);
							}

							clone.firstElementChild.setAttribute("data-vedor-list-item", true);
							clone.firstElementChild.setAttribute("data-vedor-selectable", true);
							list.appendChild(clone);
							editor.data.list.init(listData[j], clone);
						} else {
							for (e=0; e<list.templates[requestedTemplate].contentNode.childNodes.length; e++) {
								clone = list.templates[requestedTemplate].contentNode.childNodes[e].cloneNode(true);
								initFields(clone);
								editor.data.list.fixFirstElementChild(clone);

								counter = 0;
								for (t in list.templates) {
									counter++;
								}
								if (counter > 1) {
									clone.setAttribute("data-vedor-template", requestedTemplate);
								}
								clone.setAttribute("data-vedor-list-item", true);
								clone.setAttribute("data-vedor-selectable", true);

								list.appendChild(clone);
								editor.data.list.init(listData[j], clone);
							}
						}
					}
					list.setAttribute("data-vedor-selectable", true);
				}
			}
		},
		field : {
			set : function(field, data) {
				var attr;
				switch (field.tagName) {
					case "IMG":
					case "IFRAME":
						if (typeof data == "string") {
							data = {"src" : data};
						}
						for (attr in data) {
							field.setAttribute(attr, data[attr]);
						}
					break;
					case "META":
						for (attr in data) {
							field.setAttribute(attr, data[attr]);
						}
					break;
					case "A":
						for (attr in data) {
							if (attr == "innerHTML") {
								field.innerHTML = data[attr];
							} else {
								field.setAttribute(attr, data[attr]);
							}
						}
					break;
					default:
						field.innerHTML = data;
					break;
				}
			},
			get : function(field) {
				var attr;
				var attributes = {};
				var allowedAttributes = {};

				switch (field.tagName) {
					case "IMG": 
						allowedAttributes = ["src", "class", "alt", "title"];
					break;
					case "A":
						allowedAttributes = ["href", "class", "alt", "title"];
						attributes.innerHTML = field.innerHTML;
					break;
					case "META":
						allowedAttributes = ["content"];
					break;
					case "IFRAME":
						allowedAttributes = ["src"];
					break;
					default:
					return field.innerHTML;
				}
				for (attr in allowedAttributes) {
					attr = allowedAttributes[attr];
					if (field.getAttribute(attr)) {
						attributes[attr] = field.getAttribute(attr);
					}
				}
				return attributes;
			}
		},
		loadBaseStyles : function() {
			var baseStyles = document.createElement("link");
			baseStyles.setAttribute("href", editor.baseURL + "vedor/vedor-base.css");
			baseStyles.setAttribute("rel", "stylesheet");
			baseStyles.setAttribute("type", "text/css");
			document.getElementsByTagName("HEAD")[0].appendChild(baseStyles);
		},
		init : function(config) {
			document.createElement("template");
			document.body.innerHTML = document.body.innerHTML;
			if (config.toolbars) {
				editor.editmode.toolbars = config.toolbars;
			}
			editor.loadBaseStyles();

			editor.storage = storage.init(config.endpoint);
			editor.data.load();
		},
		editmode : {
			toolbars : null,
			init : function() {
				var toolbarsContainer = document.createElement("DIV");
				toolbarsContainer.id = "vedor-editor";
				document.body.appendChild(toolbarsContainer);

				var http = new XMLHttpRequest();
				var url = editor.baseURL + "vedor/toolbars.html";
				url += "?t=" + (new Date().getTime());

				var loadToolbars = function() {
					if (!editor.toolbar || (typeof muze === "undefined")) {
						// Main toolbar code isn't loaded yet, delay a bit;
						window.setTimeout(loadToolbars, 100);
						return;
					}

					var loadToolbar = function(url) {
						var i;
						var http = new XMLHttpRequest();
						url += "?t=" + (new Date().getTime());

						http.open("GET", url, true);
						http.onreadystatechange = function() {//Call a function when the state changes.
							if(http.readyState == 4 && http.status == 200) {
								var toolbars = document.createElement("TEMPLATE");
								toolbars.innerHTML = http.responseText;

								if (!("content" in toolbars)) {
									var fragment = document.createDocumentFragment();
									while (toolbars.children.length) {
										fragment.appendChild(toolbars.children[0]);
									}
									toolbars.content = fragment;
								}
								// editor.brokenImport = true;
								var toolbarNode = document.importNode(toolbars.content, true);
								if (editor.brokenImport) {
									editor.importScripts = true;
								}
								if (editor.importScripts) {
									var scriptTags = toolbars.content.querySelectorAll("SCRIPT");
									for (i=0; i<scriptTags.length; i++) {
										var newNode = document.createElement("SCRIPT");
										if (scriptTags[i].src) {
											newNode.src = scriptTags[i].src;
										}
										if (scriptTags[i].innerHTML) {
											newNode.innerHTML = scriptTags[i].innerHTML;
										}
										document.head.appendChild(newNode);
									}
								}

								var newToolbars = toolbarNode.querySelectorAll(".vedor-toolbar,.vedor-dialog-body");
								for (i=0; i<newToolbars.length; i++) {
									editor.toolbar.init(newToolbars[i]);
								}
								toolbarsContainer.appendChild(toolbarNode);
							}
						};
						http.send();
					};

					for (var i=0; i<editor.editmode.toolbars.length; i++) {
						loadToolbar(editor.editmode.toolbars[i]);
					}

					editor.editmode.toolbarMonitor();
				};

				http.open("GET", url, true);
				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4 && http.status == 200) {
						var i;

						var toolbars = document.createElement("TEMPLATE");
						toolbars.innerHTML = http.responseText;
						if (!("content" in toolbars)) {
							var fragment = document.createDocumentFragment();
							while (toolbars.children.length) {
								fragment.appendChild(toolbars.children[0]);
							}
							toolbars.content = fragment;
						}

						editor.brokenImport = true;
						var toolbarNode = document.importNode(toolbars.content, true);
						toolbarsContainer.appendChild(toolbarNode);
						
						if (editor.brokenImport) {
							editor.importScripts = true;
						}
						if (editor.brokenImport) {
							var scriptTags = toolbars.content.querySelectorAll("SCRIPT");
							for (i=0; i<scriptTags.length; i++) {
								var newNode = document.createElement("SCRIPT");
								if (scriptTags[i].src) {
									newNode.src = scriptTags[i].src;
								}
								if (scriptTags[i].innerHTML) {
									newNode.innerHTML = scriptTags[i].innerHTML;
								}
								document.head.appendChild(newNode);
							}
						}
						loadToolbars();
					}
				};
				http.send();


				var addScript = function(src) {
					var scriptTag = document.createElement("SCRIPT");
					scriptTag.setAttribute("src", src);
					document.head.appendChild(scriptTag);
				};

				// Add slip.js for sortable items;
				addScript(editor.baseURL + "vedor/slip.js");

				// Add hope
				addScript(editor.baseURL + "hope/hope.packed.js");
			},

			
			editable : function(target) {
				var i;

				var dataFields = target.querySelectorAll("[data-vedor-field]");

				for (i=0; i<dataFields.length; i++) {
				//	dataFields[i].contentEditable = true;
					switch (dataFields[i].tagName.toLowerCase()) {
						case "iframe":
						case "meta":
						case "title":
							dataFields[i].contentEditable = true;
						break;
						case "img":
						default:
							dataFields[i].hopeContent = document.createElement("textarea");
							dataFields[i].hopeMarkup = document.createElement("textarea");
							dataFields[i].hopeRenderedSource = document.createElement("DIV");
							dataFields[i].hopeEditor = hope.editor.create( dataFields[i].hopeContent, dataFields[i].hopeMarkup, dataFields[i], dataFields[i].hopeRenderedSource );
							dataFields[i].hopeEditor.field = dataFields[i];

							var parseTimer = false;
					
/*							var nodeInserted = function(evt) {
								console.log(evt);

								dataFields[i].removeEventListener("DOMNodeInserted", nodeInserted);
								console.log('parsing');
								dataFields[i].hopeEditor.parseHTML();
								console.log('parsed');
								window.setTimeout(function() {
								//	dataFields[i].addEventListener("DOMNodeInserted", nodeInserted);
								}, 10);
							};
							dataFields[i].addEventListener("DOMNodeInserted", nodeInserted);
*/
						break;
					}

					// FIXME: Add support to keep fields that point to the same field within the same path in sync here;
				}

				var dataLists = target.querySelectorAll("[data-vedor-list]");
				for (i=0; i<dataLists.length; i++) {
					dataLists[i].setAttribute("data-vedor-selectable", true);
				}

				var hyperlinks = target.querySelectorAll("a");
				var handleDblClick = function(evt) {
					if (
						this.pathname
					) {
						var pathname = this.pathname;
						var hostname = this.hostname;
						if (hostname == document.location.hostname && (typeof editor.currentData[this.pathname] == "undefined")) {
							history.pushState(null, null, this.href + "#vedor-edit");
							document.body.innerHTML = editor.data.originalBody.innerHTML;
							editor.data.load();
							var openTemplateDialog = function() {
								if (editor.actions['vedor-template']) {
									if (!document.getElementById("vedor-template")) {
										window.setTimeout(openTemplateDialog, 200);
										return;
									}
									editor.actions['vedor-template']();
								} else {
									alert("This page does not exist yet. Save it to create it!");
								}
							};
							openTemplateDialog();
							evt.preventDefault();
						} else {
							document.location.href = this.href + "#vedor-edit";
						}
					}
				};
				var handleClick = function(event) {
					event.preventDefault();
				};

				for (i=0; i<hyperlinks.length; i++) {
					hyperlinks[i].addEventListener("dblclick", handleDblClick);
					hyperlinks[i].addEventListener("click", handleClick);
				}

				var images = target.querySelectorAll("img[data-vedor-field]");
				var imageDrop = function(event) {
					var imageData = event.dataTransfer.getData("text/html");

					var container = document.createElement("DIV");
					container.innerHTML = imageData;
					
					var image = container.querySelector("img");

					if (image && image.getAttribute("src")) {
						this.src = image.getAttribute("src");
					}
					if (event.stopPropagation) {
						event.stopPropagation(); // stops the browser from redirecting.
					}
					event.preventDefault();
				};

				for (i=0; i<images.length; i++) {
					images[i].addEventListener("drop", imageDrop);
					images[i].contentEditable = true; // needs to be true for drop event?
					images[i].setAttribute("data-vedor-selectable", true);
				}

				// FIXME: Have a way to now init plugins as well;
				editor.editmode.sortable(target);
				editor.editmode.textonly(target);
			},
			sortable : function(target) {
				if (!window.Slip) {
					window.setTimeout(function() {
						editor.editmode.sortable(target);
					}, 500);

					return;
				}

				var list = target.querySelectorAll("[data-vedor-sortable]");
				
				var preventDefault = function(evt) {
					evt.preventDefault();
				};
				
				var addBeforeOrderEvent = function(e) {
					var sublists = this.querySelectorAll("[data-vedor-sortable]");
					for (var j=0; j<sublists.length; j++) {
						sublists[j].addEventListener('slip:beforereorder', preventDefault);
					}
				};
				var removeBeforeOrderEvent = function(e) {
					e.target.parentNode.insertBefore(e.target, e.detail.insertBefore);
								
					var sublists = this.querySelectorAll("[data-vedor-sortable]");
					for (var j=0; j<sublists.length; j++) {
						sublists[j].removeEventListener('slip:beforereorder', preventDefault);
					}
					return false;
				};

				for (var i=0; i<list.length; i++) {
					list[i].addEventListener('slip:reorder', removeBeforeOrderEvent, false);
				
					if (list[i].querySelectorAll('[data-vedor-sortable]').length) {
						list[i].addEventListener('slip:beforereorder', addBeforeOrderEvent, false);
					}
					
					new Slip(list[i]);
				}
			},
			textonly : function(target) {
				var textonly = target.querySelectorAll("[data-vedor-content='text']");
				var preventNodeInsert = function(evt) {
					if (evt.target.tagName) {
						editor.node.unwrap(evt.target);
					}
				};

				for (var i=0; i<textonly.length; i++) {
					textonly[i].addEventListener("DOMNodeInserted", preventNodeInsert);
				}
			},
			stop : function() {
				editor.storage.disconnect();
				document.location.href = document.location.href.split("#")[0];
			},
			toolbarMonitor : function() {
				var target = document.querySelector('#vedor-main-toolbar');
				if (!target) {
					window.setTimeout(editor.editmode.toolbarMonitor, 100);
					return false;
				}

				var setBodyTop = function() {
					var style = document.head.querySelector("#vedor-body-top");
					if (!style) {
						style = document.createElement("style");
						style.setAttribute("type", "text/css");

						style.id = "vedor-body-top";
						document.head.appendChild(style);
					}

					if (document.getElementById("vedor-main-toolbar")) {
						var toolbarHeight = document.getElementById("vedor-main-toolbar").offsetHeight;
						style.innerHTML = "html:before { display: block; width: 100%; height: " + toolbarHeight + "px; content: ''; }";
					}
				};

				// create an observer instance
				var observer = new MutationObserver(setBodyTop);

				// configuration of the observer:
				var config = { childList: true, subtree: true, attributes: true, characterData: true };

				// pass in the target node, as well as the observer options
				observer.observe(target, config);

				window.setTimeout(setBodyTop, 100);
			}
		}
	};

	var storage = {
		getType : function(endpoint) {
		        if (endpoint === null) {
                                endpoint = document.location.href;
                        }
                        
			if (endpoint.indexOf("/ariadne/loader.php/") !== -1) {
				return "ariadne";
			} else if (endpoint.indexOf("github.io") !== -1) {
				return "github";
			} else if (endpoint.indexOf("github.com") !== -1) {
				return "github";
			} else if (endpoint.indexOf("neocities.org") !== -1) {
				return "neocities";
			}
			return "default";
		},
		init : function(endpoint) {
			var storageType = storage.getType(endpoint);
			if (!storage[storageType]) {
				storageType = "default";
			}
			var result = storage[storageType];
			if (typeof result.init === "function") {
				result.init(endpoint);
			}
			return result;
		},
		ariadne : {
                        init : function(endpoint) {
				if (endpoint === null) {
					endpoint = location.origin + "/";
				}
                                this.url = endpoint;
                        },
			save : function(data, callback) {
				var http = new XMLHttpRequest();
				var url = editor.storage.url + "data.json";

				http.open("PUT", url, true);
				http.withCredentials = true;

				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4 && http.status == 200) {
						callback();
					}
				};
				http.send(data);
			},
			load : function(callback) {
				var http = new XMLHttpRequest();
				var url = editor.storage.url + "data.json";
				url += "?t=" + (new Date().getTime());
				http.open("GET", url, true);
				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4 && http.status == 200) {
						callback(http.responseText);
					}
				};
				http.send();
			},
			connect : function() {
				return true;
			},
			disconnect : function() {
				delete editor.storage.key;
				delete localStorage.storageKey;
			}
		},
		neocities : {
                        init : function(endpoint) {
				if (endpoint === null) {
					endpoint = location.origin + "/";
				}
                                this.url = endpoint;
                        },
			save : function(data, callback) {
				var http = new XMLHttpRequest();
				var url = "https://neocities.org/api/upload";
				var params = "data.json=" + encodeURIComponent(data);

				http.open("POST", url, true);
				//Send the proper header information along with the request
				http.withCredentials = true;
				http.setRequestHeader("Content-type", "application/x-www-form-urlencoded; charset=utf-8");
				http.setRequestHeader("Authorization", "Basic " + editor.storage.key);
				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4 && http.status == 200) {
						callback();
					}
				};
				http.send(params);
			},
			load : function(callback) {
				var http = new XMLHttpRequest();
				var url = editor.storage.url + "data.json";
				url += "?t=" + (new Date().getTime());

				http.open("GET", url, true);
				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4 && http.status == 200) {
						callback(http.responseText);
					}
				};
				http.send();
			},
			validateKey : function() {
				return true;
			},
			connect : function() {
				if (!editor.storage.key) {
					editor.storage.key = localStorage.storageKey;
				}
				if (!editor.storage.key) {
					editor.storage.key = prompt("Please enter your authentication key");
				}

				if (editor.storage.validateKey(editor.storage.key)) {
					localStorage.storageKey = editor.storage.key;
					return true;
				} else {
					return editor.storage.connect();
				}
			},
			disconnect : function() {
				delete editor.storage.key;
				delete localStorage.storageKey;
			}
		},
		github : {
			repoName : null,
			repoUser : null,
			repoBranch : "gh-pages",
			dataFile : "data.json",
			init : function(endpoint) {
				if (endpoint === null) {
					endpoint = document.location;
				}
				var script = document.createElement("SCRIPT");
				script.src = "http://se-cdn.muze.nl/github.js";
				document.head.appendChild(script);

				var parser = document.createElement('a');
				parser.href = endpoint;

				if (parser.hostname == "github.com") {
					this.repoUser = parser.pathname.split("/")[1];
					this.repoName = parser.pathname.split("/")[2];
					this.repoBranch = "master";
				} else {
					this.repoUser = parser.hostname.split(".")[0];
					this.repoName = parser.pathname.split("/")[1];
					this.repoBranch = "gh-pages";
				}

				this.dataFile = "data.json";
			},
			connect : function() {
				if (!editor.storage.key) {
					editor.storage.key = localStorage.storageKey;
				}
				if (!editor.storage.key) {
					editor.storage.key = prompt("Please enter your authentication key");
				}

				if (editor.storage.validateKey(editor.storage.key)) {
					if (!this.repo) {
						localStorage.storageKey = editor.storage.key;
						var github = new Github({
							token: editor.storage.key,
							auth: "oauth"
						});
						this.repo = github.getRepo(this.repoUser, this.repoName);
					}
					return true;
				} else {
					return editor.storage.connect();
				}
			},
			disconnect : function() {
				delete this.repo;
				delete localStorage.storageKey;
			},
			validateKey : function(key) {
				return true;
			},
			save : function(data, callback) {
				this.repo.write(this.repoBranch, this.dataFile, data, "Commit message", callback);
			},
			load : function(callback) {
				var http = new XMLHttpRequest();
				var url = "https://raw.githubusercontent.com/" + this.repoUser + "/" + this.repoName + "/" + this.repoBranch + "/" + this.dataFile;
				url += "?t=" + (new Date().getTime());
				http.open("GET", url, true);
				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4 && http.status == 200) {
						callback(http.responseText);
					}
					if(http.readyState == 4 && http.status == 404) {
						callback("{}");
					}
				};
				http.send();
			},
			saveTemplate : function(pageTemplate, callback) {
				var dataPath = location.pathname.split(/\//, 3)[2];
				if (dataPath.match(/\/$/)) {
					dataPath += "index.html";
				}

				var repo = this.repo;
				repo.read(this.repoBranch, pageTemplate, function(err, data) {
					if (data) {
						repo.write(this.repoBranch, dataPath, data, pageTemplate + " (copy)", callback);
					}
				});
			}
		},
		default : {
		        init : function(endpoint) {
				if (endpoint === null) {
					endpoint = location.origin + "/";
				}
                                this.url = endpoint;
		        },
			save : function(data, callback) {
				var http = new XMLHttpRequest();
				var url = editor.storage.url + "data/data.json";

				http.open("PUT", url, true);
				//Send the proper header information along with the request
				http.setRequestHeader("Content-type", "application/json");
				http.setRequestHeader("charset", "UTF-8");

				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4 && http.status == 200) {
						callback();
					}
				};
				http.send(data);
			},
			load : function(callback) {
				var http = new XMLHttpRequest();
				var url = editor.storage.url + "data/data.json";
				url += "?t=" + (new Date().getTime());

				http.open("GET", url, true);
				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4 && http.status == 200) {
						callback(http.responseText);
					}
				};
				http.send();
			},
			connect : function() {
				return true;
			},
			disconnect : function() {
				delete editor.storage.key;
				delete localStorage.storageKey;
			}
		}
	};


	editor.actions = {
		"vedor-save" : editor.data.save,
		"vedor-logout" : editor.editmode.stop
	};

	editor.toolbars = {};
	editor.contextFilters = {};
	editor.plugins = {};

	editor.addToolbar = function(toolbar) {
		if (toolbar.filter) {
			editor.addContextFilter(toolbar.name, toolbar.filter);
		}
		for (var i in toolbar.actions) {
			editor.actions[i] = toolbar.actions[i];
		}
		editor.toolbars[toolbar.name] = toolbar;
		if (toolbar.init) {
			toolbar.init();
		}
	};

	editor.addContextFilter = function(name, filter) {
		if (!filter.context) {
			filter.context = name;
		}
		editor.contextFilters[name] = filter;
	};
	editor.addAction = function(name, action) {
		editor.actions[name] = action;
	};

	var preventDOMContentLoaded = function(event) {
		event.preventDefault();
		return false;
	};

	if ("addEventListener" in document) {
		document.addEventListener("DOMContentLoaded", preventDOMContentLoaded, true);
		window.addEventListener("load", preventDOMContentLoaded, true);
	}

	if (typeof jQuery !== "undefined") {
		jQuery.holdReady(true);
	}

	// Add fake window.console for IE8/9
	if (!window.console) console = {log: function() {}};

/*	document.addEventListener("click", function(evt) {
		if (
			evt.target && 
			evt.target.pathname
		) {
			var pathname = evt.target.pathname;
			var hostname = evt.target.hostname;
			if (hostname == document.location.hostname && (typeof editor.currentData[evt.target.pathname] !== "undefined")) {
				history.pushState(null, null, evt.target.href);
				document.body.innerHTML = editor.data.originalBody.innerHTML;
				editor.data.load();
				evt.preventDefault();
			}
		}
	});
*/
	window.editor = editor;
	editor.init({
		endpoint : document.querySelector("[data-vedor-endpoint]") ? document.querySelector("[data-vedor-endpoint]").getAttribute("data-vedor-endpoint") : null,
		toolbars : [
			editor.baseURL + "vedor/toolbar.vedor-main-toolbar.html",
			editor.baseURL + "vedor/toolbar.vedor-hope-text.html",
			editor.baseURL + "vedor/toolbar.vedor-hope-image.html",
			editor.baseURL + "vedor/plugin.vedor-image-browse.html",
			editor.baseURL + "vedor/toolbar.vedor-iframe.html",
                        editor.baseURL + "vedor/toolbar.vedor-selectable.html",
                        editor.baseURL + "vedor/toolbar.vedor-list.html",
//                        editor.baseURL + "vedor/plugin.vedor-template.html",
                        editor.baseURL + "vedor/plugin.vedor-save.html",
                        editor.baseURL + "vedor/plugin.vedor-meta.html",
                        editor.baseURL + "vedor/plugin.vedor-htmlsource.html",
                        editor.baseURL + "vedor/plugin.vedor-symbol.html",
//                        editor.baseURL + "vedor/plugin.vedor-plain.html",
//                        editor.baseURL + "vedor/plugin.vedor-dropbox.html",
			editor.baseURL + "vedor/plugin.vedor-paste.html",
			editor.baseURL + "vedor/plugin.vedor-keyboard.html"
		]
	});
}());