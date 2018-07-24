/**
 * Owl carousel
 * @version 2.0.0
 * @author Bartosz Wojciechowski
 * @license The MIT License (MIT)
 * @todo Lazy Load Icon
 * @todo prevent animationend bubling
 * @todo itemsScaleUp
 * @todo Test Zepto
 * @todo stagePadding calculate wrong active classes
 */
;(function($, window, document, undefined) {

	var drag, state, e;

	/**
	 * Template for status information about drag and touch events.
	 * @private
	 */
	drag = {
		start: 0,
		startX: 0,
		startY: 0,
		current: 0,
		currentX: 0,
		currentY: 0,
		offsetX: 0,
		offsetY: 0,
		distance: null,
		startTime: 0,
		endTime: 0,
		updatedX: 0,
		targetEl: null
	};

	/**
	 * Template for some status informations.
	 * @private
	 */
	state = {
		isTouch: false,
		isScrolling: false,
		isSwiping: false,
		direction: false,
		inMotion: false
	};

	/**
	 * Event functions references.
	 * @private
	 */
	e = {
		_onDragStart: null,
		_onDragMove: null,
		_onDragEnd: null,
		_transitionEnd: null,
		_resizer: null,
		_responsiveCall: null,
		_goToLoop: null,
		_checkVisibile: null
	};

	/**
	 * Creates a carousel.
	 * @class The Owl Carousel.
	 * @public
	 * @param {HTMLElement|jQuery} element - The element to create the carousel for.
	 * @param {Object} [options] - The options
	 */
	function Owl(element, options) {

		/**
		 * Current settings for the carousel.
		 * @public
		 */
		this.settings = null;

		/**
		 * Current options set by the caller including defaults.
		 * @public
		 */
		this.options = $.extend({}, Owl.Defaults, options);

		/**
		 * Plugin element.
		 * @public
		 */
		this.$element = $(element);

		/**
		 * Caches informations about drag and touch events.
		 */
		this.drag = $.extend({}, drag);

		/**
		 * Caches some status informations.
		 * @protected
		 */
		this.state = $.extend({}, state);

		/**
		 * @protected
		 * @todo Must be documented
		 */
		this.e = $.extend({}, e);

		/**
		 * References to the running plugins of this carousel.
		 * @protected
		 */
		this._plugins = {};

		/**
		 * Currently suppressed events to prevent them from beeing retriggered.
		 * @protected
		 */
		this._supress = {};

		/**
		 * Absolute current position.
		 * @protected
		 */
		this._current = null;

		/**
		 * Animation speed in milliseconds.
		 * @protected
		 */
		this._speed = null;

		/**
		 * Coordinates of all items in pixel.
		 * @todo The name of this member is missleading.
		 * @protected
		 */
		this._coordinates = [];

		/**
		 * Current breakpoint.
		 * @todo Real media queries would be nice.
		 * @protected
		 */
		this._breakpoint = null;

		/**
		 * Current width of the plugin element.
		 */
		this._width = null;

		/**
		 * All real items.
		 * @protected
		 */
		this._items = [];

		/**
		 * All cloned items.
		 * @protected
		 */
		this._clones = [];

		/**
		 * Merge values of all items.
		 * @todo Maybe this could be part of a plugin.
		 * @protected
		 */
		this._mergers = [];

		/**
		 * Invalidated parts within the update process.
		 * @protected
		 */
		this._invalidated = {};

		/**
		 * Ordered list of workers for the update process.
		 * @protected
		 */
		this._pipe = [];

		$.each(Owl.Plugins, $.proxy(function(key, plugin) {
			this._plugins[key[0].toLowerCase() + key.slice(1)]
				= new plugin(this);
		}, this));

		$.each(Owl.Pipe, $.proxy(function(priority, worker) {
			this._pipe.push({
				'filter': worker.filter,
				'run': $.proxy(worker.run, this)
			});
		}, this));

		this.setup();
		this.initialize();
	}

	/**
	 * Default options for the carousel.
	 * @public
	 */
	Owl.Defaults = {
		items: 3,
		loop: false,
		center: false,

		mouseDrag: true,
		touchDrag: true,
		pullDrag: true,
		freeDrag: false,

		margin: 0,
		stagePadding: 0,

		merge: false,
		mergeFit: true,
		autoWidth: false,

		startPosition: 0,
		rtl: false,

		smartSpeed: 250,
		fluidSpeed: false,
		dragEndSpeed: false,

		responsive: {},
		responsiveRefreshRate: 200,
		responsiveBaseElement: window,
		responsiveClass: false,

		fallbackEasing: 'swing',

		info: false,

		nestedItemSelector: false,
		itemElement: 'div',
		stageElement: 'div',

		// Classes and Names
		themeClass: 'owl-theme',
		baseClass: 'owl-carousel',
		itemClass: 'owl-item',
		centerClass: 'center',
		activeClass: 'active'
	};

	/**
	 * Enumeration for width.
	 * @public
	 * @readonly
	 * @enum {String}
	 */
	Owl.Width = {
		Default: 'default',
		Inner: 'inner',
		Outer: 'outer'
	};

	/**
	 * Contains all registered plugins.
	 * @public
	 */
	Owl.Plugins = {};

	/**
	 * Update pipe.
	 */
	Owl.Pipe = [ {
		filter: [ 'width', 'items', 'settings' ],
		run: function(cache) {
			cache.current = this._items && this._items[this.relative(this._current)];
		}
	}, {
		filter: [ 'items', 'settings' ],
		run: function() {
			var cached = this._clones,
				clones = this.$stage.children('.cloned');

			if (clones.length !== cached.length || (!this.settings.loop && cached.length > 0)) {
				this.$stage.children('.cloned').remove();
				this._clones = [];
			}
		}
	}, {
		filter: [ 'items', 'settings' ],
		run: function() {
			var i, n,
				clones = this._clones,
				items = this._items,
				delta = this.settings.loop ? clones.length - Math.max(this.settings.items * 2, 4) : 0;

			for (i = 0, n = Math.abs(delta / 2); i < n; i++) {
				if (delta > 0) {
					this.$stage.children().eq(items.length + clones.length - 1).remove();
					clones.pop();
					this.$stage.children().eq(0).remove();
					clones.pop();
				} else {
					clones.push(clones.length / 2);
					this.$stage.append(items[clones[clones.length - 1]].clone().addClass('cloned'));
					clones.push(items.length - 1 - (clones.length - 1) / 2);
					this.$stage.prepend(items[clones[clones.length - 1]].clone().addClass('cloned'));
				}
			}
		}
	}, {
		filter: [ 'width', 'items', 'settings' ],
		run: function() {
			var rtl = (this.settings.rtl ? 1 : -1),
				width = (this.width() / this.settings.items).toFixed(3),
				coordinate = 0, merge, i, n;

			this._coordinates = [];
			for (i = 0, n = this._clones.length + this._items.length; i < n; i++) {
				merge = this._mergers[this.relative(i)];
				merge = (this.settings.mergeFit && Math.min(merge, this.settings.items)) || merge;
				coordinate += (this.settings.autoWidth ? this._items[this.relative(i)].width() + this.settings.margin : width * merge) * rtl;

				this._coordinates.push(coordinate);
			}
		}
	}, {
		filter: [ 'width', 'items', 'settings' ],
		run: function() {
			var i, n, width = (this.width() / this.settings.items).toFixed(3), css = {
				'width': Math.abs(this._coordinates[this._coordinates.length - 1]) + this.settings.stagePadding * 2,
				'padding-left': this.settings.stagePadding || '',
				'padding-right': this.settings.stagePadding || ''
			};

			this.$stage.css(css);

			css = { 'width': this.settings.autoWidth ? 'auto' : width - this.settings.margin };
			css[this.settings.rtl ? 'margin-left' : 'margin-right'] = this.settings.margin;

			if (!this.settings.autoWidth && $.grep(this._mergers, function(v) { return v > 1 }).length > 0) {
				for (i = 0, n = this._coordinates.length; i < n; i++) {
					css.width = Math.abs(this._coordinates[i]) - Math.abs(this._coordinates[i - 1] || 0) - this.settings.margin;
					this.$stage.children().eq(i).css(css);
				}
			} else {
				this.$stage.children().css(css);
			}
		}
	}, {
		filter: [ 'width', 'items', 'settings' ],
		run: function(cache) {
			cache.current && this.reset(this.$stage.children().index(cache.current));
		}
	}, {
		filter: [ 'position' ],
		run: function() {
			this.animate(this.coordinates(this._current));
		}
	}, {
		filter: [ 'width', 'position', 'items', 'settings' ],
		run: function() {
			var rtl = this.settings.rtl ? 1 : -1,
				padding = this.settings.stagePadding * 2,
				begin = this.coordinates(this.current()) + padding,
				end = begin + this.width() * rtl,
				inner, outer, matches = [], i, n;

			for (i = 0, n = this._coordinates.length; i < n; i++) {
				inner = this._coordinates[i - 1] || 0;
				outer = Math.abs(this._coordinates[i]) + padding * rtl;

				if ((this.op(inner, '<=', begin) && (this.op(inner, '>', end)))
					|| (this.op(outer, '<', begin) && this.op(outer, '>', end))) {
					matches.push(i);
				}
			}

			this.$stage.children('.' + this.settings.activeClass).removeClass(this.settings.activeClass);
			this.$stage.children(':eq(' + matches.join('), :eq(') + ')').addClass(this.settings.activeClass);

			if (this.settings.center) {
				this.$stage.children('.' + this.settings.centerClass).removeClass(this.settings.centerClass);
				this.$stage.children().eq(this.current()).addClass(this.settings.centerClass);
			}
		}
	} ];

	/**
	 * Initializes the carousel.
	 * @protected
	 */
	Owl.prototype.initialize = function() {
		this.trigger('initialize');

		this.$element
			.addClass(this.settings.baseClass)
			.addClass(this.settings.themeClass)
			.toggleClass('owl-rtl', this.settings.rtl);

		// check support
		this.browserSupport();

		if (this.settings.autoWidth && this.state.imagesLoaded !== true) {
			var imgs, nestedSelector, width;
			imgs = this.$element.find('img');
			nestedSelector = this.settings.nestedItemSelector ? '.' + this.settings.nestedItemSelector : undefined;
			width = this.$element.children(nestedSelector).width();

			if (imgs.length && width <= 0) {
				this.preloadAutoWidthImages(imgs);
				return false;
			}
		}

		this.$element.addClass('owl-loading');

		// create stage
		this.$stage = $('<' + this.settings.stageElement + ' class="owl-stage"/>')
			.wrap('<div class="owl-stage-outer">');

		// append stage
		this.$element.append(this.$stage.parent());

		// append content
		this.replace(this.$element.children().not(this.$stage.parent()));

		// set view width
		this._width = this.$element.width();

		// update view
		this.refresh();

		this.$element.removeClass('owl-loading').addClass('owl-loaded');

		// attach generic events
		this.eventsCall();

		// attach generic events
		this.internalEvents();

		// attach custom control events
		this.addTriggerableEvents();

		this.trigger('initialized');
	};

	/**
	 * Setups the current settings.
	 * @todo Remove responsive classes. Why should adaptive designs be brought into IE8?
	 * @todo Support for media queries by using `matchMedia` would be nice.
	 * @public
	 */
	Owl.prototype.setup = function() {
		var viewport = this.viewport(),
			overwrites = this.options.responsive,
			match = -1,
			settings = null;

		if (!overwrites) {
			settings = $.extend({}, this.options);
		} else {
			$.each(overwrites, function(breakpoint) {
				if (breakpoint <= viewport && breakpoint > match) {
					match = Number(breakpoint);
				}
			});

			settings = $.extend({}, this.options, overwrites[match]);
			delete settings.responsive;

			// responsive class
			if (settings.responsiveClass) {
				this.$element.attr('class', function(i, c) {
					return c.replace(/\b owl-responsive-\S+/g, '');
				}).addClass('owl-responsive-' + match);
			}
		}

		if (this.settings === null || this._breakpoint !== match) {
			this.trigger('change', { property: { name: 'settings', value: settings } });
			this._breakpoint = match;
			this.settings = settings;
			this.invalidate('settings');
			this.trigger('changed', { property: { name: 'settings', value: this.settings } });
		}
	};

	/**
	 * Updates option logic if necessery.
	 * @protected
	 */
	Owl.prototype.optionsLogic = function() {
		// Toggle Center class
		this.$element.toggleClass('owl-center', this.settings.center);

		// if items number is less than in body
		if (this.settings.loop && this._items.length < this.settings.items) {
			this.settings.loop = false;
		}

		if (this.settings.autoWidth) {
			this.settings.stagePadding = false;
			this.settings.merge = false;
		}
	};

	/**
	 * Prepares an item before add.
	 * @todo Rename event parameter `content` to `item`.
	 * @protected
	 * @returns {jQuery|HTMLElement} - The item container.
	 */
	Owl.prototype.prepare = function(item) {
		var event = this.trigger('prepare', { content: item });

		if (!event.data) {
			event.data = $('<' + this.settings.itemElement + '/>')
				.addClass(this.settings.itemClass).append(item)
		}

		this.trigger('prepared', { content: event.data });

		return event.data;
	};

	/**
	 * Updates the view.
	 * @public
	 */
	Owl.prototype.update = function() {
		var i = 0,
			n = this._pipe.length,
			filter = $.proxy(function(p) { return this[p] }, this._invalidated),
			cache = {};

		while (i < n) {
			if (this._invalidated.all || $.grep(this._pipe[i].filter, filter).length > 0) {
				this._pipe[i].run(cache);
			}
			i++;
		}

		this._invalidated = {};
	};

	/**
	 * Gets the width of the view.
	 * @public
	 * @param {Owl.Width} [dimension=Owl.Width.Default] - The dimension to return.
	 * @returns {Number} - The width of the view in pixel.
	 */
	Owl.prototype.width = function(dimension) {
		dimension = dimension || Owl.Width.Default;
		switch (dimension) {
			case Owl.Width.Inner:
			case Owl.Width.Outer:
				return this._width;
			default:
				return this._width - this.settings.stagePadding * 2 + this.settings.margin;
		}
	};

	/**
	 * Refreshes the carousel primarily for adaptive purposes.
	 * @public
	 */
	Owl.prototype.refresh = function() {
		if (this._items.length === 0) {
			return false;
		}

		var start = new Date().getTime();

		this.trigger('refresh');

		this.setup();

		this.optionsLogic();

		// hide and show methods helps here to set a proper widths,
		// this prevents scrollbar to be calculated in stage width
		this.$stage.addClass('owl-refresh');

		this.update();

		this.$stage.removeClass('owl-refresh');

		this.state.orientation = window.orientation;

		this.watchVisibility();

		this.trigger('refreshed');
	};

	/**
	 * Save internal event references and add event based functions.
	 * @protected
	 */
	Owl.prototype.eventsCall = function() {
		// Save events references
		this.e._onDragStart = $.proxy(function(e) {
			this.onDragStart(e);
		}, this);
		this.e._onDragMove = $.proxy(function(e) {
			this.onDragMove(e);
		}, this);
		this.e._onDragEnd = $.proxy(function(e) {
			this.onDragEnd(e);
		}, this);
		this.e._onResize = $.proxy(function(e) {
			this.onResize(e);
		}, this);
		this.e._transitionEnd = $.proxy(function(e) {
			this.transitionEnd(e);
		}, this);
		this.e._preventClick = $.proxy(function(e) {
			this.preventClick(e);
		}, this);
	};

	/**
	 * Checks window `resize` event.
	 * @protected
	 */
	Owl.prototype.onThrottledResize = function() {
		window.clearTimeout(this.resizeTimer);
		this.resizeTimer = window.setTimeout(this.e._onResize, this.settings.responsiveRefreshRate);
	};

	/**
	 * Checks window `resize` event.
	 * @protected
	 */
	Owl.prototype.onResize = function() {
		if (!this._items.length) {
			return false;
		}

		if (this._width === this.$element.width()) {
			return false;
		}

		if (this.trigger('resize').isDefaultPrevented()) {
			return false;
		}

		this._width = this.$element.width();

		this.invalidate('width');

		this.refresh();

		this.trigger('resized');
	};

	/**
	 * Checks for touch/mouse drag event type and add run event handlers.
	 * @protected
	 */
	Owl.prototype.eventsRouter = function(event) {
		var type = event.type;

		if (type === "mousedown" || type === "touchstart") {
			this.onDragStart(event);
		} else if (type === "mousemove" || type === "touchmove") {
			this.onDragMove(event);
		} else if (type === "mouseup" || type === "touchend") {
			this.onDragEnd(event);
		} else if (type === "touchcancel") {
			this.onDragEnd(event);
		}
	};

	/**
	 * Checks for touch/mouse drag options and add necessery event handlers.
	 * @protected
	 */
	Owl.prototype.internalEvents = function() {
		var isTouch = isTouchSupport(),
			isTouchIE = isTouchSupportIE();

		if (this.settings.mouseDrag){
			this.$stage.on('mousedown', $.proxy(function(event) { this.eventsRouter(event) }, this));
			this.$stage.on('dragstart', function() { return false });
			this.$stage.get(0).onselectstart = function() { return false };
		} else {
			this.$element.addClass('owl-text-select-on');
		}

		if (this.settings.touchDrag && !isTouchIE){
			this.$stage.on('touchstart touchcancel', $.proxy(function(event) { this.eventsRouter(event) }, this));
		}

		// catch transitionEnd event
		if (this.transitionEndVendor) {
			this.on(this.$stage.get(0), this.transitionEndVendor, this.e._transitionEnd, false);
		}

		// responsive
		if (this.settings.responsive !== false) {
			this.on(window, 'resize', $.proxy(this.onThrottledResize, this));
		}
	};

	/**
	 * Handles touchstart/mousedown event.
	 * @protected
	 * @param {Event} event - The event arguments.
	 */
	Owl.prototype.onDragStart = function(event) {
		var ev, isTouchEvent, pageX, pageY, animatedPos;

		ev = event.originalEvent || event || window.event;

		// prevent right click
		if (ev.which === 3 || this.state.isTouch) {
			return false;
		}

		if (ev.type === 'mousedown') {
			this.$stage.addClass('owl-grab');
		}

		this.trigger('drag');
		this.drag.startTime = new Date().getTime();
		this.speed(0);
		this.state.isTouch = true;
		this.state.isScrolling = false;
		this.state.isSwiping = false;
		this.drag.distance = 0;

		pageX = getTouches(ev).x;
		pageY = getTouches(ev).y;

		// get stage position left
		this.drag.offsetX = this.$stage.position().left;
		this.drag.offsetY = this.$stage.position().top;

		if (this.settings.rtl) {
			this.drag.offsetX = this.$stage.position().left + this.$stage.width() - this.width()
				+ this.settings.margin;
		}

		// catch position // ie to fix
		if (this.state.inMotion && this.support3d) {
			animatedPos = this.getTransformProperty();
			this.drag.offsetX = animatedPos;
			this.animate(animatedPos);
			this.state.inMotion = true;
		} else if (this.state.inMotion && !this.support3d) {
			this.state.inMotion = false;
			return false;
		}

		this.drag.startX = pageX - this.drag.offsetX;
		this.drag.startY = pageY - this.drag.offsetY;

		this.drag.start = pageX - this.drag.startX;
		this.drag.targetEl = ev.target || ev.srcElement;
		this.drag.updatedX = this.drag.start;

		// to do/check
		// prevent links and images dragging;
		if (this.drag.targetEl.tagName === "IMG" || this.drag.targetEl.tagName === "A") {
			this.drag.targetEl.draggable = false;
		}

		$(document).on('mousemove.owl.dragEvents mouseup.owl.dragEvents touchmove.owl.dragEvents touchend.owl.dragEvents', $.proxy(function(event) {this.eventsRouter(event)},this));
	};

	/**
	 * Handles the touchmove/mousemove events.
	 * @todo Simplify
	 * @protected
	 * @param {Event} event - The event arguments.
	 */
	Owl.prototype.onDragMove = function(event) {
		var ev, isTouchEvent, pageX, pageY, minValue, maxValue, pull;

		if (!this.state.isTouch) {
			return;
		}

		if (this.state.isScrolling) {
			return;
		}

		ev = event.originalEvent || event || window.event;

		pageX = getTouches(ev).x;
		pageY = getTouches(ev).y;

		// Drag Direction
		this.drag.currentX = pageX - this.drag.startX;
		this.drag.currentY = pageY - this.drag.startY;
		this.drag.distance = this.drag.currentX - this.drag.offsetX;

		// Check move direction
		if (this.drag.distance < 0) {
			this.state.direction = this.settings.rtl ? 'right' : 'left';
		} else if (this.drag.distance > 0) {
			this.state.direction = this.settings.rtl ? 'left' : 'right';
		}
		// Loop
		if (this.settings.loop) {
			if (this.op(this.drag.currentX, '>', this.coordinates(this.minimum())) && this.state.direction === 'right') {
				this.drag.currentX -= (this.settings.center && this.coordinates(0)) - this.coordinates(this._items.length);
			} else if (this.op(this.drag.currentX, '<', this.coordinates(this.maximum())) && this.state.direction === 'left') {
				this.drag.currentX += (this.settings.center && this.coordinates(0)) - this.coordinates(this._items.length);
			}
		} else {
			// pull
			minValue = this.settings.rtl ? this.coordinates(this.maximum()) : this.coordinates(this.minimum());
			maxValue = this.settings.rtl ? this.coordinates(this.minimum()) : this.coordinates(this.maximum());
			pull = this.settings.pullDrag ? this.drag.distance / 5 : 0;
			this.drag.currentX = Math.max(Math.min(this.drag.currentX, minValue + pull), maxValue + pull);
		}

		// Lock browser if swiping horizontal

		if ((this.drag.distance > 8 || this.drag.distance < -8)) {
			if (ev.preventDefault !== undefined) {
				ev.preventDefault();
			} else {
				ev.returnValue = false;
			}
			this.state.isSwiping = true;
		}

		this.drag.updatedX = this.drag.currentX;

		// Lock Owl if scrolling
		if ((this.drag.currentY > 16 || this.drag.currentY < -16) && this.state.isSwiping === false) {
			this.state.isScrolling = true;
			this.drag.updatedX = this.drag.start;
		}

		this.animate(this.drag.updatedX);
	};

	/**
	 * Handles the touchend/mouseup events.
	 * @protected
	 */
	Owl.prototype.onDragEnd = function(event) {
		var compareTimes, distanceAbs, closest;

		if (!this.state.isTouch) {
			return;
		}

		if (event.type === 'mouseup') {
			this.$stage.removeClass('owl-grab');
		}

		this.trigger('dragged');

		// prevent links and images dragging;
		this.drag.targetEl.removeAttribute("draggable");

		// remove drag event listeners

		this.state.isTouch = false;
		this.state.isScrolling = false;
		this.state.isSwiping = false;

		// to check
		if (this.drag.distance === 0 && this.state.inMotion !== true) {
			this.state.inMotion = false;
			return false;
		}

		// prevent clicks while scrolling

		this.drag.endTime = new Date().getTime();
		compareTimes = this.drag.endTime - this.drag.startTime;
		distanceAbs = Math.abs(this.drag.distance);

		// to test
		if (distanceAbs > 3 || compareTimes > 300) {
			this.removeClick(this.drag.targetEl);
		}

		closest = this.closest(this.drag.updatedX);

		this.speed(this.settings.dragEndSpeed || this.settings.smartSpeed);
		this.current(closest);
		this.invalidate('position');
		this.update();

		// if pullDrag is off then fire transitionEnd event manually when stick
		// to border
		if (!this.settings.pullDrag && this.drag.updatedX === this.coordinates(closest)) {
			this.transitionEnd();
		}

		this.drag.distance = 0;

		$(document).off('.owl.dragEvents');
	};

	/**
	 * Attaches `preventClick` to disable link while swipping.
	 * @protected
	 * @param {HTMLElement} [target] - The target of the `click` event.
	 */
	Owl.prototype.removeClick = function(target) {
		this.drag.targetEl = target;
		$(target).on('click.preventClick', this.e._preventClick);
		// to make sure click is removed:
		window.setTimeout(function() {
			$(target).off('click.preventClick');
		}, 300);
	};

	/**
	 * Suppresses click event.
	 * @protected
	 * @param {Event} ev - The event arguments.
	 */
	Owl.prototype.preventClick = function(ev) {
		if (ev.preventDefault) {
			ev.preventDefault();
		} else {
			ev.returnValue = false;
		}
		if (ev.stopPropagation) {
			ev.stopPropagation();
		}
		$(ev.target).off('click.preventClick');
	};

	/**
	 * Catches stage position while animate (only CSS3).
	 * @protected
	 * @returns
	 */
	Owl.prototype.getTransformProperty = function() {
		var transform, matrix3d;

		transform = window.getComputedStyle(this.$stage.get(0), null).getPropertyValue(this.vendorName + 'transform');
		// var transform = this.$stage.css(this.vendorName + 'transform')
		transform = transform.replace(/matrix(3d)?\(|\)/g, '').split(',');
		matrix3d = transform.length === 16;

		return matrix3d !== true ? transform[4] : transform[12];
	};

	/**
	 * Gets absolute position of the closest item for a coordinate.
	 * @todo Setting `freeDrag` makes `closest` not reusable. See #165.
	 * @protected
	 * @param {Number} coordinate - The coordinate in pixel.
	 * @return {Number} - The absolute position of the closest item.
	 */
	Owl.prototype.closest = function(coordinate) {
		var position = -1, pull = 30, width = this.width(), coordinates = this.coordinates();

		if (!this.settings.freeDrag) {
			// check closest item
			$.each(coordinates, $.proxy(function(index, value) {
				if (coordinate > value - pull && coordinate < value + pull) {
					position = index;
				} else if (this.op(coordinate, '<', value)
					&& this.op(coordinate, '>', coordinates[index + 1] || value - width)) {
					position = this.state.direction === 'left' ? index + 1 : index;
				}
				return position === -1;
			}, this));
		}

		if (!this.settings.loop) {
			// non loop boundries
			if (this.op(coordinate, '>', coordinates[this.minimum()])) {
				position = coordinate = this.minimum();
			} else if (this.op(coordinate, '<', coordinates[this.maximum()])) {
				position = coordinate = this.maximum();
			}
		}

		return position;
	};

	/**
	 * Animates the stage.
	 * @public
	 * @param {Number} coordinate - The coordinate in pixels.
	 */
	Owl.prototype.animate = function(coordinate) {
		this.trigger('translate');
		this.state.inMotion = this.speed() > 0;

		if (this.support3d) {
			this.$stage.css({
				transform: 'translate3d(' + coordinate + 'px' + ',0px, 0px)',
				transition: (this.speed() / 1000) + 's'
			});
		} else if (this.state.isTouch) {
			this.$stage.css({
				left: coordinate + 'px'
			});
		} else {
			this.$stage.animate({
				left: coordinate
			}, this.speed() / 1000, this.settings.fallbackEasing, $.proxy(function() {
				if (this.state.inMotion) {
					this.transitionEnd();
				}
			}, this));
		}
	};

	/**
	 * Sets the absolute position of the current item.
	 * @public
	 * @param {Number} [position] - The new absolute position or nothing to leave it unchanged.
	 * @returns {Number} - The absolute position of the current item.
	 */
	Owl.prototype.current = function(position) {
		if (position === undefined) {
			return this._current;
		}

		if (this._items.length === 0) {
			return undefined;
		}

		position = this.normalize(position);

		if (this._current !== position) {
			var event = this.trigger('change', { property: { name: 'position', value: position } });

			if (event.data !== undefined) {
				position = this.normalize(event.data);
			}

			this._current = position;

			this.invalidate('position');

			this.trigger('changed', { property: { name: 'position', value: this._current } });
		}

		return this._current;
	};

	/**
	 * Invalidates the given part of the update routine.
	 * @param {String} part - The part to invalidate.
	 */
	Owl.prototype.invalidate = function(part) {
		this._invalidated[part] = true;
	}

	/**
	 * Resets the absolute position of the current item.
	 * @public
	 * @param {Number} position - The absolute position of the new item.
	 */
	Owl.prototype.reset = function(position) {
		position = this.normalize(position);

		if (position === undefined) {
			return;
		}

		this._speed = 0;
		this._current = position;

		this.suppress([ 'translate', 'translated' ]);

		this.animate(this.coordinates(position));

		this.release([ 'translate', 'translated' ]);
	};

	/**
	 * Normalizes an absolute or a relative position for an item.
	 * @public
	 * @param {Number} position - The absolute or relative position to normalize.
	 * @param {Boolean} [relative=false] - Whether the given position is relative or not.
	 * @returns {Number} - The normalized position.
	 */
	Owl.prototype.normalize = function(position, relative) {
		var n = (relative ? this._items.length : this._items.length + this._clones.length);

		if (!$.isNumeric(position) || n < 1) {
			return undefined;
		}

		if (this._clones.length) {
			position = ((position % n) + n) % n;
		} else {
			position = Math.max(this.minimum(relative), Math.min(this.maximum(relative), position));
		}

		return position;
	};

	/**
	 * Converts an absolute position for an item into a relative position.
	 * @public
	 * @param {Number} position - The absolute position to convert.
	 * @returns {Number} - The converted position.
	 */
	Owl.prototype.relative = function(position) {
		position = this.normalize(position);
		position = position - this._clones.length / 2;
		return this.normalize(position, true);
	};

	/**
	 * Gets the maximum position for an item.
	 * @public
	 * @param {Boolean} [relative=false] - Whether to return an absolute position or a relative position.
	 * @returns {Number}
	 */
	Owl.prototype.maximum = function(relative) {
		var maximum, width, i = 0, coordinate,
			settings = this.settings;

		if (relative) {
			return this._items.length - 1;
		}

		if (!settings.loop && settings.center) {
			maximum = this._items.length - 1;
		} else if (!settings.loop && !settings.center) {
			maximum = this._items.length - settings.items;
		} else if (settings.loop || settings.center) {
			maximum = this._items.length + settings.items;
		} else if (settings.autoWidth || settings.merge) {
			revert = settings.rtl ? 1 : -1;
			width = this.$stage.width() - this.$element.width();
			while (coordinate = this.coordinates(i)) {
				if (coordinate * revert >= width) {
					break;
				}
				maximum = ++i;
			}
		} else {
			throw 'Can not detect maximum absolute position.'
		}

		return maximum;
	};

	/**
	 * Gets the minimum position for an item.
	 * @public
	 * @param {Boolean} [relative=false] - Whether to return an absolute position or a relative position.
	 * @returns {Number}
	 */
	Owl.prototype.minimum = function(relative) {
		if (relative) {
			return 0;
		}

		return this._clones.length / 2;
	};

	/**
	 * Gets an item at the specified relative position.
	 * @public
	 * @param {Number} [position] - The relative position of the item.
	 * @return {jQuery|Array.<jQuery>} - The item at the given position or all items if no position was given.
	 */
	Owl.prototype.items = function(position) {
		if (position === undefined) {
			return this._items.slice();
		}

		position = this.normalize(position, true);
		return this._items[position];
	};

	/**
	 * Gets an item at the specified relative position.
	 * @public
	 * @param {Number} [position] - The relative position of the item.
	 * @return {jQuery|Array.<jQuery>} - The item at the given position or all items if no position was given.
	 */
	Owl.prototype.mergers = function(position) {
		if (position === undefined) {
			return this._mergers.slice();
		}

		position = this.normalize(position, true);
		return this._mergers[position];
	};

	/**
	 * Gets the absolute positions of clones for an item.
	 * @public
	 * @param {Number} [position] - The relative position of the item.
	 * @returns {Array.<Number>} - The absolute positions of clones for the item or all if no position was given.
	 */
	Owl.prototype.clones = function(position) {
		var odd = this._clones.length / 2,
			even = odd + this._items.length,
			map = function(index) { return index % 2 === 0 ? even + index / 2 : odd - (index + 1) / 2 };

		if (position === undefined) {
			return $.map(this._clones, function(v, i) { return map(i) });
		}

		return $.map(this._clones, function(v, i) { return v === position ? map(i) : null });
	};

	/**
	 * Sets the current animation speed.
	 * @public
	 * @param {Number} [speed] - The animation speed in milliseconds or nothing to leave it unchanged.
	 * @returns {Number} - The current animation speed in milliseconds.
	 */
	Owl.prototype.speed = function(speed) {
		if (speed !== undefined) {
			this._speed = speed;
		}

		return this._speed;
	};

	/**
	 * Gets the coordinate of an item.
	 * @todo The name of this method is missleanding.
	 * @public
	 * @param {Number} position - The absolute position of the item within `minimum()` and `maximum()`.
	 * @returns {Number|Array.<Number>} - The coordinate of the item in pixel or all coordinates.
	 */
	Owl.prototype.coordinates = function(position) {
		var coordinate = null;

		if (position === undefined) {
			return $.map(this._coordinates, $.proxy(function(coordinate, index) {
				return this.coordinates(index);
			}, this));
		}

		if (this.settings.center) {
			coordinate = this._coordinates[position];
			coordinate += (this.width() - coordinate + (this._coordinates[position - 1] || 0)) / 2 * (this.settings.rtl ? -1 : 1);
		} else {
			coordinate = this._coordinates[position - 1] || 0;
		}

		return coordinate;
	};

	/**
	 * Calculates the speed for a translation.
	 * @protected
	 * @param {Number} from - The absolute position of the start item.
	 * @param {Number} to - The absolute position of the target item.
	 * @param {Number} [factor=undefined] - The time factor in milliseconds.
	 * @returns {Number} - The time in milliseconds for the translation.
	 */
	Owl.prototype.duration = function(from, to, factor) {
		return Math.min(Math.max(Math.abs(to - from), 1), 6) * Math.abs((factor || this.settings.smartSpeed));
	};

	/**
	 * Slides to the specified item.
	 * @public
	 * @param {Number} position - The position of the item.
	 * @param {Number} [speed] - The time in milliseconds for the transition.
	 */
	Owl.prototype.to = function(position, speed) {
		if (this.settings.loop) {
			var distance = position - this.relative(this.current()),
				revert = this.current(),
				before = this.current(),
				after = this.current() + distance,
				direction = before - after < 0 ? true : false,
				items = this._clones.length + this._items.length;

			if (after < this.settings.items && direction === false) {
				revert = before + this._items.length;
				this.reset(revert);
			} else if (after >= items - this.settings.items && direction === true) {
				revert = before - this._items.length;
				this.reset(revert);
			}
			window.clearTimeout(this.e._goToLoop);
			this.e._goToLoop = window.setTimeout($.proxy(function() {
				this.speed(this.duration(this.current(), revert + distance, speed));
				this.current(revert + distance);
				this.update();
			}, this), 30);
		} else {
			this.speed(this.duration(this.current(), position, speed));
			this.current(position);
			this.update();
		}
	};

	/**
	 * Slides to the next item.
	 * @public
	 * @param {Number} [speed] - The time in milliseconds for the transition.
	 */
	Owl.prototype.next = function(speed) {
		speed = speed || false;
		this.to(this.relative(this.current()) + 1, speed);
	};

	/**
	 * Slides to the previous item.
	 * @public
	 * @param {Number} [speed] - The time in milliseconds for the transition.
	 */
	Owl.prototype.prev = function(speed) {
		speed = speed || false;
		this.to(this.relative(this.current()) - 1, speed);
	};

	/**
	 * Handles the end of an animation.
	 * @protected
	 * @param {Event} event - The event arguments.
	 */
	Owl.prototype.transitionEnd = function(event) {

		// if css2 animation then event object is undefined
		if (event !== undefined) {
			event.stopPropagation();

			// Catch only owl-stage transitionEnd event
			if ((event.target || event.srcElement || event.originalTarget) !== this.$stage.get(0)) {
				return false;
			}
		}

		this.state.inMotion = false;
		this.trigger('translated');
	};

	/**
	 * Gets viewport width.
	 * @protected
	 * @return {Number} - The width in pixel.
	 */
	Owl.prototype.viewport = function() {
		var width;
		if (this.options.responsiveBaseElement !== window) {
			width = $(this.options.responsiveBaseElement).width();
		} else if (window.innerWidth) {
			width = window.innerWidth;
		} else if (document.documentElement && document.documentElement.clientWidth) {
			width = document.documentElement.clientWidth;
		} else {
			throw 'Can not detect viewport width.';
		}
		return width;
	};

	/**
	 * Replaces the current content.
	 * @public
	 * @param {HTMLElement|jQuery|String} content - The new content.
	 */
	Owl.prototype.replace = function(content) {
		this.$stage.empty();
		this._items = [];

		if (content) {
			content = (content instanceof jQuery) ? content : $(content);
		}

		if (this.settings.nestedItemSelector) {
			content = content.find('.' + this.settings.nestedItemSelector);
		}

		content.filter(function() {
			return this.nodeType === 1;
		}).each($.proxy(function(index, item) {
			item = this.prepare(item);
			this.$stage.append(item);
			this._items.push(item);
			this._mergers.push(item.find('[data-merge]').andSelf('[data-merge]').attr('data-merge') * 1 || 1);
		}, this));

		this.reset($.isNumeric(this.settings.startPosition) ? this.settings.startPosition : 0);

		this.invalidate('items');
	};

	/**
	 * Adds an item.
	 * @todo Use `item` instead of `content` for the event arguments.
	 * @public
	 * @param {HTMLElement|jQuery|String} content - The item content to add.
	 * @param {Number} [position] - The relative position at which to insert the item otherwise the item will be added to the end.
	 */
	Owl.prototype.add = function(content, position) {
		position = position === undefined ? this._items.length : this.normalize(position, true);

		this.trigger('add', { content: content, position: position });

		if (this._items.length === 0 || position === this._items.length) {
			this.$stage.append(content);
			this._items.push(content);
			this._mergers.push(content.find('[data-merge]').andSelf('[data-merge]').attr('data-merge') * 1 || 1);
		} else {
			this._items[position].before(content);
			this._items.splice(position, 0, content);
			this._mergers.splice(position, 0, content.find('[data-merge]').andSelf('[data-merge]').attr('data-merge') * 1 || 1);
		}

		this.invalidate('items');

		this.trigger('added', { content: content, position: position });
	};

	/**
	 * Removes an item by its position.
	 * @todo Use `item` instead of `content` for the event arguments.
	 * @public
	 * @param {Number} position - The relative position of the item to remove.
	 */
	Owl.prototype.remove = function(position) {
		position = this.normalize(position, true);

		if (position === undefined) {
			return;
		}

		this.trigger('remove', { content: this._items[position], position: position });

		this._items[position].remove();
		this._items.splice(position, 1);
		this._mergers.splice(position, 1);

		this.invalidate('items');

		this.trigger('removed', { content: null, position: position });
	};

	/**
	 * Adds triggerable events.
	 * @protected
	 */
	Owl.prototype.addTriggerableEvents = function() {
		var handler = $.proxy(function(callback, event) {
			return $.proxy(function(e) {
				if (e.relatedTarget !== this) {
					this.suppress([ event ]);
					callback.apply(this, [].slice.call(arguments, 1));
					this.release([ event ]);
				}
			}, this);
		}, this);

		$.each({
			'next': this.next,
			'prev': this.prev,
			'to': this.to,
			'destroy': this.destroy,
			'refresh': this.refresh,
			'replace': this.replace,
			'add': this.add,
			'remove': this.remove
		}, $.proxy(function(event, callback) {
			this.$element.on(event + '.owl.carousel', handler(callback, event + '.owl.carousel'));
		}, this));

	};

	/**
	 * Watches the visibility of the carousel element.
	 * @protected
	 */
	Owl.prototype.watchVisibility = function() {

		// test on zepto
		if (!isElVisible(this.$element.get(0))) {
			this.$element.addClass('owl-hidden');
			window.clearInterval(this.e._checkVisibile);
			this.e._checkVisibile = window.setInterval($.proxy(checkVisible, this), 500);
		}

		function isElVisible(el) {
			return el.offsetWidth > 0 && el.offsetHeight > 0;
		}

		function checkVisible() {
			if (isElVisible(this.$element.get(0))) {
				this.$element.removeClass('owl-hidden');
				this.refresh();
				window.clearInterval(this.e._checkVisibile);
			}
		}
	};

	/**
	 * Preloads images with auto width.
	 * @protected
	 * @todo Still to test
	 */
	Owl.prototype.preloadAutoWidthImages = function(imgs) {
		var loaded, that, $el, img;

		loaded = 0;
		that = this;
		imgs.each(function(i, el) {
			$el = $(el);
			img = new Image();

			img.onload = function() {
				loaded++;
				$el.attr('src', img.src);
				$el.css('opacity', 1);
				if (loaded >= imgs.length) {
					that.state.imagesLoaded = true;
					that.initialize();
				}
			};

			img.src = $el.attr('src') || $el.attr('data-src') || $el.attr('data-src-retina');
		});
	};

	/**
	 * Destroys the carousel.
	 * @public
	 */
	Owl.prototype.destroy = function() {

		if (this.$element.hasClass(this.settings.themeClass)) {
			this.$element.removeClass(this.settings.themeClass);
		}

		if (this.settings.responsive !== false) {
			$(window).off('resize.owl.carousel');
		}

		if (this.transitionEndVendor) {
			this.off(this.$stage.get(0), this.transitionEndVendor, this.e._transitionEnd);
		}

		for ( var i in this._plugins) {
			this._plugins[i].destroy();
		}

		if (this.settings.mouseDrag || this.settings.touchDrag) {
			this.$stage.off('mousedown touchstart touchcancel');
			$(document).off('.owl.dragEvents');
			this.$stage.get(0).onselectstart = function() {};
			this.$stage.off('dragstart', function() { return false });
		}

		// remove event handlers in the ".owl.carousel" namespace
		this.$element.off('.owl');

		this.$stage.children('.cloned').remove();
		this.e = null;
		this.$element.removeData('owlCarousel');

		this.$stage.children().contents().unwrap();
		this.$stage.children().unwrap();
		this.$stage.unwrap();
	};

	/**
	 * Operators to calculate right-to-left and left-to-right.
	 * @protected
	 * @param {Number} [a] - The left side operand.
	 * @param {String} [o] - The operator.
	 * @param {Number} [b] - The right side operand.
	 */
	Owl.prototype.op = function(a, o, b) {
		var rtl = this.settings.rtl;
		switch (o) {
			case '<':
				return rtl ? a > b : a < b;
			case '>':
				return rtl ? a < b : a > b;
			case '>=':
				return rtl ? a <= b : a >= b;
			case '<=':
				return rtl ? a >= b : a <= b;
			default:
				break;
		}
	};

	/**
	 * Attaches to an internal event.
	 * @protected
	 * @param {HTMLElement} element - The event source.
	 * @param {String} event - The event name.
	 * @param {Function} listener - The event handler to attach.
	 * @param {Boolean} capture - Wether the event should be handled at the capturing phase or not.
	 */
	Owl.prototype.on = function(element, event, listener, capture) {
		if (element.addEventListener) {
			element.addEventListener(event, listener, capture);
		} else if (element.attachEvent) {
			element.attachEvent('on' + event, listener);
		}
	};

	/**
	 * Detaches from an internal event.
	 * @protected
	 * @param {HTMLElement} element - The event source.
	 * @param {String} event - The event name.
	 * @param {Function} listener - The attached event handler to detach.
	 * @param {Boolean} capture - Wether the attached event handler was registered as a capturing listener or not.
	 */
	Owl.prototype.off = function(element, event, listener, capture) {
		if (element.removeEventListener) {
			element.removeEventListener(event, listener, capture);
		} else if (element.detachEvent) {
			element.detachEvent('on' + event, listener);
		}
	};

	/**
	 * Triggers an public event.
	 * @protected
	 * @param {String} name - The event name.
	 * @param {*} [data=null] - The event data.
	 * @param {String} [namespace=.owl.carousel] - The event namespace.
	 * @returns {Event} - The event arguments.
	 */
	Owl.prototype.trigger = function(name, data, namespace) {
		var status = {
			item: { count: this._items.length, index: this.current() }
		}, handler = $.camelCase(
			$.grep([ 'on', name, namespace ], function(v) { return v })
				.join('-').toLowerCase()
		), event = $.Event(
			[ name, 'owl', namespace || 'carousel' ].join('.').toLowerCase(),
			$.extend({ relatedTarget: this }, status, data)
		);

		if (!this._supress[name]) {
			$.each(this._plugins, function(name, plugin) {
				if (plugin.onTrigger) {
					plugin.onTrigger(event);
				}
			});

			this.$element.trigger(event);

			if (this.settings && typeof this.settings[handler] === 'function') {
				this.settings[handler].apply(this, event);
			}
		}

		return event;
	};

	/**
	 * Suppresses events.
	 * @protected
	 * @param {Array.<String>} events - The events to suppress.
	 */
	Owl.prototype.suppress = function(events) {
		$.each(events, $.proxy(function(index, event) {
			this._supress[event] = true;
		}, this));
	}

	/**
	 * Releases suppressed events.
	 * @protected
	 * @param {Array.<String>} events - The events to release.
	 */
	Owl.prototype.release = function(events) {
		$.each(events, $.proxy(function(index, event) {
			delete this._supress[event];
		}, this));
	}

	/**
	 * Checks the availability of some browser features.
	 * @protected
	 */
	Owl.prototype.browserSupport = function() {
		this.support3d = isPerspective();

		if (this.support3d) {
			this.transformVendor = isTransform();

			// take transitionend event name by detecting transition
			var endVendors = [ 'transitionend', 'webkitTransitionEnd', 'transitionend', 'oTransitionEnd' ];
			this.transitionEndVendor = endVendors[isTransition()];

			// take vendor name from transform name
			this.vendorName = this.transformVendor.replace(/Transform/i, '');
			this.vendorName = this.vendorName !== '' ? '-' + this.vendorName.toLowerCase() + '-' : '';
		}

		this.state.orientation = window.orientation;
	};

	/**
	 * Get touch/drag coordinats.
	 * @private
	 * @param {event} - mousedown/touchstart event
	 * @returns {object} - Contains X and Y of current mouse/touch position
	 */

	function getTouches(event) {
		if (event.touches !== undefined) {
			return {
				x: event.touches[0].pageX,
				y: event.touches[0].pageY
			};
		}

		if (event.touches === undefined) {
			if (event.pageX !== undefined) {
				return {
					x: event.pageX,
					y: event.pageY
				};
			}

		if (event.pageX === undefined) {
			return {
					x: event.clientX,
					y: event.clientY
				};
			}
		}
	}

	/**
	 * Checks for CSS support.
	 * @private
	 * @param {Array} array - The CSS properties to check for.
	 * @returns {Array} - Contains the supported CSS property name and its index or `false`.
	 */
	function isStyleSupported(array) {
		var p, s, fake = document.createElement('div'), list = array;
		for (p in list) {
			s = list[p];
			if (typeof fake.style[s] !== 'undefined') {
				fake = null;
				return [ s, p ];
			}
		}
		return [ false ];
	}

	/**
	 * Checks for CSS transition support.
	 * @private
	 * @todo Realy bad design
	 * @returns {Number}
	 */
	function isTransition() {
		return isStyleSupported([ 'transition', 'WebkitTransition', 'MozTransition', 'OTransition' ])[1];
	}

	/**
	 * Checks for CSS transform support.
	 * @private
	 * @returns {String} The supported property name or false.
	 */
	function isTransform() {
		return isStyleSupported([ 'transform', 'WebkitTransform', 'MozTransform', 'OTransform', 'msTransform' ])[0];
	}

	/**
	 * Checks for CSS perspective support.
	 * @private
	 * @returns {String} The supported property name or false.
	 */
	function isPerspective() {
		return isStyleSupported([ 'perspective', 'webkitPerspective', 'MozPerspective', 'OPerspective', 'MsPerspective' ])[0];
	}

	/**
	 * Checks wether touch is supported or not.
	 * @private
	 * @returns {Boolean}
	 */
	function isTouchSupport() {
		return 'ontouchstart' in window || !!(navigator.msMaxTouchPoints);
	}

	/**
	 * Checks wether touch is supported or not for IE.
	 * @private
	 * @returns {Boolean}
	 */
	function isTouchSupportIE() {
		return window.navigator.msPointerEnabled;
	}

	/**
	 * The jQuery Plugin for the Owl Carousel
	 * @public
	 */
	$.fn.owlCarousel = function(options) {
		return this.each(function() {
			if (!$(this).data('owlCarousel')) {
				$(this).data('owlCarousel', new Owl(this, options));
			}
		});
	};

	/**
	 * The constructor for the jQuery Plugin
	 * @public
	 */
	$.fn.owlCarousel.Constructor = Owl;

})(window.Zepto || window.jQuery, window, document);

/**
 * Lazy Plugin
 * @version 2.0.0
 * @author Bartosz Wojciechowski
 * @license The MIT License (MIT)
 */
;(function($, window, document, undefined) {

	/**
	 * Creates the lazy plugin.
	 * @class The Lazy Plugin
	 * @param {Owl} carousel - The Owl Carousel
	 */
	var Lazy = function(carousel) {

		/**
		 * Reference to the core.
		 * @protected
		 * @type {Owl}
		 */
		this._core = carousel;

		/**
		 * Already loaded items.
		 * @protected
		 * @type {Array.<jQuery>}
		 */
		this._loaded = [];

		/**
		 * Event handlers.
		 * @protected
		 * @type {Object}
		 */
		this._handlers = {
			'initialized.owl.carousel change.owl.carousel': $.proxy(function(e) {
				if (!e.namespace) {
					return;
				}

				if (!this._core.settings || !this._core.settings.lazyLoad) {
					return;
				}

				if ((e.property && e.property.name == 'position') || e.type == 'initialized') {
					var settings = this._core.settings,
						n = (settings.center && Math.ceil(settings.items / 2) || settings.items),
						i = ((settings.center && n * -1) || 0),
						position = ((e.property && e.property.value) || this._core.current()) + i,
						clones = this._core.clones().length,
						load = $.proxy(function(i, v) { this.load(v) }, this);

					while (i++ < n) {
						this.load(clones / 2 + this._core.relative(position));
						clones && $.each(this._core.clones(this._core.relative(position++)), load);
					}
				}
			}, this)
		};

		// set the default options
		this._core.options = $.extend({}, Lazy.Defaults, this._core.options);

		// register event handler
		this._core.$element.on(this._handlers);
	}

	/**
	 * Default options.
	 * @public
	 */
	Lazy.Defaults = {
		lazyLoad: false
	}

	/**
	 * Loads all resources of an item at the specified position.
	 * @param {Number} position - The absolute position of the item.
	 * @protected
	 */
	Lazy.prototype.load = function(position) {
		var $item = this._core.$stage.children().eq(position),
			$elements = $item && $item.find('.owl-lazy');

		if (!$elements || $.inArray($item.get(0), this._loaded) > -1) {
			return;
		}

		$elements.each($.proxy(function(index, element) {
			var $element = $(element), image,
				url = (window.devicePixelRatio > 1 && $element.attr('data-src-retina')) || $element.attr('data-src');

			this._core.trigger('load', { element: $element, url: url }, 'lazy');

			if ($element.is('img')) {
				$element.one('load.owl.lazy', $.proxy(function() {
					$element.css('opacity', 1);
					this._core.trigger('loaded', { element: $element, url: url }, 'lazy');
				}, this)).attr('src', url);
			} else {
				image = new Image();
				image.onload = $.proxy(function() {
					$element.css({
						'background-image': 'url(' + url + ')',
						'opacity': '1'
					});
					this._core.trigger('loaded', { element: $element, url: url }, 'lazy');
				}, this);
				image.src = url;
			}
		}, this));

		this._loaded.push($item.get(0));
	}

	/**
	 * Destroys the plugin.
	 * @public
	 */
	Lazy.prototype.destroy = function() {
		var handler, property;

		for (handler in this.handlers) {
			this._core.$element.off(handler, this.handlers[handler]);
		}
		for (property in Object.getOwnPropertyNames(this)) {
			typeof this[property] != 'function' && (this[property] = null);
		}
	}

	$.fn.owlCarousel.Constructor.Plugins.Lazy = Lazy;

})(window.Zepto || window.jQuery, window, document);

/**
 * AutoHeight Plugin
 * @version 2.0.0
 * @author Bartosz Wojciechowski
 * @license The MIT License (MIT)
 */
;(function($, window, document, undefined) {

	/**
	 * Creates the auto height plugin.
	 * @class The Auto Height Plugin
	 * @param {Owl} carousel - The Owl Carousel
	 */
	var AutoHeight = function(carousel) {
		/**
		 * Reference to the core.
		 * @protected
		 * @type {Owl}
		 */
		this._core = carousel;

		/**
		 * All event handlers.
		 * @protected
		 * @type {Object}
		 */
		this._handlers = {
			'initialized.owl.carousel': $.proxy(function() {
				if (this._core.settings.autoHeight) {
					this.update();
				}
			}, this),
			'changed.owl.carousel': $.proxy(function(e) {
				if (this._core.settings.autoHeight && e.property.name == 'position'){
					this.update();
				}
			}, this),
			'loaded.owl.lazy': $.proxy(function(e) {
				if (this._core.settings.autoHeight && e.element.closest('.' + this._core.settings.itemClass)
					=== this._core.$stage.children().eq(this._core.current())) {
					this.update();
				}
			}, this)
		};

		// set default options
		this._core.options = $.extend({}, AutoHeight.Defaults, this._core.options);

		// register event handlers
		this._core.$element.on(this._handlers);
	};

	/**
	 * Default options.
	 * @public
	 */
	AutoHeight.Defaults = {
		autoHeight: false,
		autoHeightClass: 'owl-height'
	};

	/**
	 * Updates the view.
	 */
	AutoHeight.prototype.update = function() {
		this._core.$stage.parent()
			.height(this._core.$stage.children().eq(this._core.current()).height())
			.addClass(this._core.settings.autoHeightClass);
	};

	AutoHeight.prototype.destroy = function() {
		var handler, property;

		for (handler in this._handlers) {
			this._core.$element.off(handler, this._handlers[handler]);
		}
		for (property in Object.getOwnPropertyNames(this)) {
			typeof this[property] != 'function' && (this[property] = null);
		}
	};

	$.fn.owlCarousel.Constructor.Plugins.AutoHeight = AutoHeight;

})(window.Zepto || window.jQuery, window, document);

/**
 * Video Plugin
 * @version 2.0.0
 * @author Bartosz Wojciechowski
 * @license The MIT License (MIT)
 */
;(function($, window, document, undefined) {

	/**
	 * Creates the video plugin.
	 * @class The Video Plugin
	 * @param {Owl} carousel - The Owl Carousel
	 */
	var Video = function(carousel) {
		/**
		 * Reference to the core.
		 * @protected
		 * @type {Owl}
		 */
		this._core = carousel;

		/**
		 * Cache all video URLs.
		 * @protected
		 * @type {Object}
		 */
		this._videos = {};

		/**
		 * Current playing item.
		 * @protected
		 * @type {jQuery}
		 */
		this._playing = null;

		/**
		 * Whether this is in fullscreen or not.
		 * @protected
		 * @type {Boolean}
		 */
		this._fullscreen = false;

		/**
		 * All event handlers.
		 * @protected
		 * @type {Object}
		 */
		this._handlers = {
			'resize.owl.carousel': $.proxy(function(e) {
				if (this._core.settings.video && !this.isInFullScreen()) {
					e.preventDefault();
				}
			}, this),
			'refresh.owl.carousel changed.owl.carousel': $.proxy(function(e) {
				if (this._playing) {
					this.stop();
				}
			}, this),
			'prepared.owl.carousel': $.proxy(function(e) {
				var $element = $(e.content).find('.owl-video');
				if ($element.length) {
					$element.css('display', 'none');
					this.fetch($element, $(e.content));
				}
			}, this)
		};

		// set default options
		this._core.options = $.extend({}, Video.Defaults, this._core.options);

		// register event handlers
		this._core.$element.on(this._handlers);

		this._core.$element.on('click.owl.video', '.owl-video-play-icon', $.proxy(function(e) {
			this.play(e);
		}, this));
	};

	/**
	 * Default options.
	 * @public
	 */
	Video.Defaults = {
		video: false,
		videoHeight: false,
		videoWidth: false
	};

	/**
	 * Gets the video ID and the type (YouTube/Vimeo only).
	 * @protected
	 * @param {jQuery} target - The target containing the video data.
	 * @param {jQuery} item - The item containing the video.
	 */
	Video.prototype.fetch = function(target, item) {

		var type = target.attr('data-vimeo-id') ? 'vimeo' : 'youtube',
			id = target.attr('data-vimeo-id') || target.attr('data-youtube-id'),
			width = target.attr('data-width') || this._core.settings.videoWidth,
			height = target.attr('data-height') || this._core.settings.videoHeight,
			url = target.attr('href');

		if (url) {
			id = url.match(/(http:|https:|)\/\/(player.|www.)?(vimeo\.com|youtu(be\.com|\.be|be\.googleapis\.com))\/(video\/|embed\/|watch\?v=|v\/)?([A-Za-z0-9._%-]*)(\&\S+)?/);

			if (id[3].indexOf('youtu') > -1) {
				type = 'youtube';
			} else if (id[3].indexOf('vimeo') > -1) {
				type = 'vimeo';
			} else {
				throw new Error('Video URL not supported.');
			}
			id = id[6];
		} else {
			throw new Error('Missing video URL.');
		}

		this._videos[url] = {
			type: type,
			id: id,
			width: width,
			height: height
		};

		item.attr('data-video', url);

		this.thumbnail(target, this._videos[url]);
	};

	/**
	 * Creates video thumbnail.
	 * @protected
	 * @param {jQuery} target - The target containing the video data.
	 * @param {Object} info - The video info object.
	 * @see `fetch`
	 */
	Video.prototype.thumbnail = function(target, video) {

		var tnLink,
			icon,
			path,
			dimensions = video.width && video.height ? 'style="width:' + video.width + 'px;height:' + video.height + 'px;"' : '',
			customTn = target.find('img'),
			srcType = 'src',
			lazyClass = '',
			settings = this._core.settings,
			create = function(path) {
				icon = '<div class="owl-video-play-icon"></div>';

				if (settings.lazyLoad) {
					tnLink = '<div class="owl-video-tn ' + lazyClass + '" ' + srcType + '="' + path + '"></div>';
				} else {
					tnLink = '<div class="owl-video-tn" style="opacity:1;background-image:url(' + path + ')"></div>';
				}
				target.after(tnLink);
				target.after(icon);
			};

		// wrap video content into owl-video-wrapper div
		target.wrap('<div class="owl-video-wrapper"' + dimensions + '></div>');

		if (this._core.settings.lazyLoad) {
			srcType = 'data-src';
			lazyClass = 'owl-lazy';
		}

		// custom thumbnail
		if (customTn.length) {
			create(customTn.attr(srcType));
			customTn.remove();
			return false;
		}

		if (video.type === 'youtube') {
			path = "http://img.youtube.com/vi/" + video.id + "/hqdefault.jpg";
			create(path);
		} else if (video.type === 'vimeo') {
			$.ajax({
				type: 'GET',
				url: 'http://vimeo.com/api/v2/video/' + video.id + '.json',
				jsonp: 'callback',
				dataType: 'jsonp',
				success: function(data) {
					path = data[0].thumbnail_large;
					create(path);
				}
			});
		}
	};

	/**
	 * Stops the current video.
	 * @public
	 */
	Video.prototype.stop = function() {
		this._core.trigger('stop', null, 'video');
		this._playing.find('.owl-video-frame').remove();
		this._playing.removeClass('owl-video-playing');
		this._playing = null;
	};

	/**
	 * Starts the current video.
	 * @public
	 * @param {Event} ev - The event arguments.
	 */
	Video.prototype.play = function(ev) {
		this._core.trigger('play', null, 'video');

		if (this._playing) {
			this.stop();
		}

		var target = $(ev.target || ev.srcElement),
			item = target.closest('.' + this._core.settings.itemClass),
			video = this._videos[item.attr('data-video')],
			width = video.width || '100%',
			height = video.height || this._core.$stage.height(),
			html, wrap;

		if (video.type === 'youtube') {
			html = '<iframe width="' + width + '" height="' + height + '" src="http://www.youtube.com/embed/'
				+ video.id + '?autoplay=1&v=' + video.id + '" frameborder="0" allowfullscreen></iframe>';
		} else if (video.type === 'vimeo') {
			html = '<iframe src="http://player.vimeo.com/video/' + video.id + '?autoplay=1" width="' + width
				+ '" height="' + height
				+ '" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>';
		}

		item.addClass('owl-video-playing');
		this._playing = item;

		wrap = $('<div style="height:' + height + 'px; width:' + width + 'px" class="owl-video-frame">'
			+ html + '</div>');
		target.after(wrap);
	};

	/**
	 * Checks whether an video is currently in full screen mode or not.
	 * @todo Bad style because looks like a readonly method but changes members.
	 * @protected
	 * @returns {Boolean}
	 */
	Video.prototype.isInFullScreen = function() {

		// if Vimeo Fullscreen mode
		var element = document.fullscreenElement || document.mozFullScreenElement
			|| document.webkitFullscreenElement;

		if (element && $(element).parent().hasClass('owl-video-frame')) {
			this._core.speed(0);
			this._fullscreen = true;
		}

		if (element && this._fullscreen && this._playing) {
			return false;
		}

		// comming back from fullscreen
		if (this._fullscreen) {
			this._fullscreen = false;
			return false;
		}

		// check full screen mode and window orientation
		if (this._playing) {
			if (this._core.state.orientation !== window.orientation) {
				this._core.state.orientation = window.orientation;
				return false;
			}
		}

		return true;
	};

	/**
	 * Destroys the plugin.
	 */
	Video.prototype.destroy = function() {
		var handler, property;

		this._core.$element.off('click.owl.video');

		for (handler in this._handlers) {
			this._core.$element.off(handler, this._handlers[handler]);
		}
		for (property in Object.getOwnPropertyNames(this)) {
			typeof this[property] != 'function' && (this[property] = null);
		}
	};

	$.fn.owlCarousel.Constructor.Plugins.Video = Video;

})(window.Zepto || window.jQuery, window, document);

/**
 * Animate Plugin
 * @version 2.0.0
 * @author Bartosz Wojciechowski
 * @license The MIT License (MIT)
 */
;(function($, window, document, undefined) {

	/**
	 * Creates the animate plugin.
	 * @class The Navigation Plugin
	 * @param {Owl} scope - The Owl Carousel
	 */
	var Animate = function(scope) {
		this.core = scope;
		this.core.options = $.extend({}, Animate.Defaults, this.core.options);
		this.swapping = true;
		this.previous = undefined;
		this.next = undefined;

		this.handlers = {
			'change.owl.carousel': $.proxy(function(e) {
				if (e.property.name == 'position') {
					this.previous = this.core.current();
					this.next = e.property.value;
				}
			}, this),
			'drag.owl.carousel dragged.owl.carousel translated.owl.carousel': $.proxy(function(e) {
				this.swapping = e.type == 'translated';
			}, this),
			'translate.owl.carousel': $.proxy(function(e) {
				if (this.swapping && (this.core.options.animateOut || this.core.options.animateIn)) {
					this.swap();
				}
			}, this)
		};

		this.core.$element.on(this.handlers);
	};

	/**
	 * Default options.
	 * @public
	 */
	Animate.Defaults = {
		animateOut: false,
		animateIn: false
	};

	/**
	 * Toggles the animation classes whenever an translations starts.
	 * @protected
	 * @returns {Boolean|undefined}
	 */
	Animate.prototype.swap = function() {

		if (this.core.settings.items !== 1 || !this.core.support3d) {
			return;
		}

		this.core.speed(0);

		var left,
			clear = $.proxy(this.clear, this),
			previous = this.core.$stage.children().eq(this.previous),
			next = this.core.$stage.children().eq(this.next),
			incoming = this.core.settings.animateIn,
			outgoing = this.core.settings.animateOut;

		if (this.core.current() === this.previous) {
			return;
		}

		if (outgoing) {
			left = this.core.coordinates(this.previous) - this.core.coordinates(this.next);
			previous.css( { 'left': left + 'px' } )
				.addClass('animated owl-animated-out')
				.addClass(outgoing)
				.one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', clear);
		}

		if (incoming) {
			next.addClass('animated owl-animated-in')
				.addClass(incoming)
				.one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', clear);
		}
	};

	Animate.prototype.clear = function(e) {
		$(e.target).css( { 'left': '' } )
			.removeClass('animated owl-animated-out owl-animated-in')
			.removeClass(this.core.settings.animateIn)
			.removeClass(this.core.settings.animateOut);
		this.core.transitionEnd();
	}

	/**
	 * Destroys the plugin.
	 * @public
	 */
	Animate.prototype.destroy = function() {
		var handler, property;

		for (handler in this.handlers) {
			this.core.$element.off(handler, this.handlers[handler]);
		}
		for (property in Object.getOwnPropertyNames(this)) {
			typeof this[property] != 'function' && (this[property] = null);
		}
	};

	$.fn.owlCarousel.Constructor.Plugins.Animate = Animate;

})(window.Zepto || window.jQuery, window, document);

/**
 * Autoplay Plugin
 * @version 2.0.0
 * @author Bartosz Wojciechowski
 * @license The MIT License (MIT)
 */
;(function($, window, document, undefined) {

	/**
	 * Creates the autoplay plugin.
	 * @class The Autoplay Plugin
	 * @param {Owl} scope - The Owl Carousel
	 */
	var Autoplay = function(scope) {
		this.core = scope;
		this.core.options = $.extend({}, Autoplay.Defaults, this.core.options);

		this.handlers = {
			'translated.owl.carousel refreshed.owl.carousel': $.proxy(function() {
				this.autoplay();
			}, this),
			'play.owl.autoplay': $.proxy(function(e, t, s) {
				this.play(t, s);
			}, this),
			'stop.owl.autoplay': $.proxy(function() {
				this.stop();
			}, this),
			'mouseover.owl.autoplay': $.proxy(function() {
				if (this.core.settings.autoplayHoverPause) {
					this.pause();
				}
			}, this),
			'mouseleave.owl.autoplay': $.proxy(function() {
				if (this.core.settings.autoplayHoverPause) {
					this.autoplay();
				}
			}, this)
		};

		this.core.$element.on(this.handlers);
	};

	/**
	 * Default options.
	 * @public
	 */
	Autoplay.Defaults = {
		autoplay: false,
		autoplayTimeout: 5000,
		autoplayHoverPause: false,
		autoplaySpeed: false
	};

	/**
	 * @protected
	 * @todo Must be documented.
	 */
	Autoplay.prototype.autoplay = function() {
		if (this.core.settings.autoplay && !this.core.state.videoPlay) {
			window.clearInterval(this.interval);

			this.interval = window.setInterval($.proxy(function() {
				this.play();
			}, this), this.core.settings.autoplayTimeout);
		} else {
			window.clearInterval(this.interval);
		}
	};

	/**
	 * Starts the autoplay.
	 * @public
	 * @param {Number} [timeout] - ...
	 * @param {Number} [speed] - ...
	 * @returns {Boolean|undefined} - ...
	 * @todo Must be documented.
	 */
	Autoplay.prototype.play = function(timeout, speed) {
		// if tab is inactive - doesnt work in <IE10
		if (document.hidden === true) {
			return;
		}

		if (this.core.state.isTouch || this.core.state.isScrolling
			|| this.core.state.isSwiping || this.core.state.inMotion) {
			return;
		}

		if (this.core.settings.autoplay === false) {
			window.clearInterval(this.interval);
			return;
		}

		this.core.next(this.core.settings.autoplaySpeed);
	};

	/**
	 * Stops the autoplay.
	 * @public
	 */
	Autoplay.prototype.stop = function() {
		window.clearInterval(this.interval);
	};

	/**
	 * Pauses the autoplay.
	 * @public
	 */
	Autoplay.prototype.pause = function() {
		window.clearInterval(this.interval);
	};

	/**
	 * Destroys the plugin.
	 */
	Autoplay.prototype.destroy = function() {
		var handler, property;

		window.clearInterval(this.interval);

		for (handler in this.handlers) {
			this.core.$element.off(handler, this.handlers[handler]);
		}
		for (property in Object.getOwnPropertyNames(this)) {
			typeof this[property] != 'function' && (this[property] = null);
		}
	};

	$.fn.owlCarousel.Constructor.Plugins.autoplay = Autoplay;

})(window.Zepto || window.jQuery, window, document);

/**
 * Navigation Plugin
 * @version 2.0.0
 * @author Artus Kolanowski
 * @license The MIT License (MIT)
 */
;(function($, window, document, undefined) {
	'use strict';

	/**
	 * Creates the navigation plugin.
	 * @class The Navigation Plugin
	 * @param {Owl} carousel - The Owl Carousel.
	 */
	var Navigation = function(carousel) {
		/**
		 * Reference to the core.
		 * @protected
		 * @type {Owl}
		 */
		this._core = carousel;

		/**
		 * Indicates whether the plugin is initialized or not.
		 * @protected
		 * @type {Boolean}
		 */
		this._initialized = false;

		/**
		 * The current paging indexes.
		 * @protected
		 * @type {Array}
		 */
		this._pages = [];

		/**
		 * All DOM elements of the user interface.
		 * @protected
		 * @type {Object}
		 */
		this._controls = {};

		/**
		 * Markup for an indicator.
		 * @protected
		 * @type {Array.<String>}
		 */
		this._templates = [];

		/**
		 * The carousel element.
		 * @type {jQuery}
		 */
		this.$element = this._core.$element;

		/**
		 * Overridden methods of the carousel.
		 * @protected
		 * @type {Object}
		 */
		this._overrides = {
			next: this._core.next,
			prev: this._core.prev,
			to: this._core.to
		};

		/**
		 * All event handlers.
		 * @protected
		 * @type {Object}
		 */
		this._handlers = {
			'prepared.owl.carousel': $.proxy(function(e) {
				if (this._core.settings.dotsData) {
					this._templates.push($(e.content).find('[data-dot]').andSelf('[data-dot]').attr('data-dot'));
				}
			}, this),
			'add.owl.carousel': $.proxy(function(e) {
				if (this._core.settings.dotsData) {
					this._templates.splice(e.position, 0, $(e.content).find('[data-dot]').andSelf('[data-dot]').attr('data-dot'));
				}
			}, this),
			'remove.owl.carousel prepared.owl.carousel': $.proxy(function(e) {
				if (this._core.settings.dotsData) {
					this._templates.splice(e.position, 1);
				}
			}, this),
			'change.owl.carousel': $.proxy(function(e) {
				if (e.property.name == 'position') {
					if (!this._core.state.revert && !this._core.settings.loop && this._core.settings.navRewind) {
						var current = this._core.current(),
							maximum = this._core.maximum(),
							minimum = this._core.minimum();
						e.data = e.property.value > maximum
							? current >= maximum ? minimum : maximum
							: e.property.value < minimum ? maximum : e.property.value;
					}
				}
			}, this),
			'changed.owl.carousel': $.proxy(function(e) {
				if (e.property.name == 'position') {
					this.draw();
				}
			}, this),
			'refreshed.owl.carousel': $.proxy(function() {
				if (!this._initialized) {
					this.initialize();
					this._initialized = true;
				}
				this._core.trigger('refresh', null, 'navigation');
				this.update();
				this.draw();
				this._core.trigger('refreshed', null, 'navigation');
			}, this)
		};

		// set default options
		this._core.options = $.extend({}, Navigation.Defaults, this._core.options);

		// register event handlers
		this.$element.on(this._handlers);
	}

	/**
	 * Default options.
	 * @public
	 * @todo Rename `slideBy` to `navBy`
	 */
	Navigation.Defaults = {
		nav: false,
		navRewind: true,
		navText: [ 'prev', 'next' ],
		navSpeed: false,
		navElement: 'div',
		navContainer: false,
		navContainerClass: 'owl-nav',
		navClass: [ 'owl-prev', 'owl-next' ],
		slideBy: 1,
		dotClass: 'owl-dot',
		dotsClass: 'owl-dots',
		dots: true,
		dotsEach: false,
		dotData: false,
		dotsSpeed: false,
		dotsContainer: false,
		controlsClass: 'owl-controls'
	}

	/**
	 * Initializes the layout of the plugin and extends the carousel.
	 * @protected
	 */
	Navigation.prototype.initialize = function() {
		var $container, override,
			options = this._core.settings;

		// create the indicator template
		if (!options.dotsData) {
			this._templates = [ $('<div>')
				.addClass(options.dotClass)
				.append($('<span>'))
				.prop('outerHTML') ];
		}

		// create controls container if needed
		if (!options.navContainer || !options.dotsContainer) {
			this._controls.$container = $('<div>')
				.addClass(options.controlsClass)
				.appendTo(this.$element);
		}

		// create DOM structure for absolute navigation
		this._controls.$indicators = options.dotsContainer ? $(options.dotsContainer)
			: $('<div>').hide().addClass(options.dotsClass).appendTo(this._controls.$container);

		this._controls.$indicators.on('click', 'div', $.proxy(function(e) {
			var index = $(e.target).parent().is(this._controls.$indicators)
				? $(e.target).index() : $(e.target).parent().index();

			e.preventDefault();

			this.to(index, options.dotsSpeed);
		}, this));

		// create DOM structure for relative navigation
		$container = options.navContainer ? $(options.navContainer)
			: $('<div>').addClass(options.navContainerClass).prependTo(this._controls.$container);

		this._controls.$next = $('<' + options.navElement + '>');
		this._controls.$previous = this._controls.$next.clone();

		this._controls.$previous
			.addClass(options.navClass[0])
			.html(options.navText[0])
			.hide()
			.prependTo($container)
			.on('click', $.proxy(function(e) {
				this.prev(options.navSpeed);
			}, this));
		this._controls.$next
			.addClass(options.navClass[1])
			.html(options.navText[1])
			.hide()
			.appendTo($container)
			.on('click', $.proxy(function(e) {
				this.next(options.navSpeed);
			}, this));

		// override public methods of the carousel
		for (override in this._overrides) {
			this._core[override] = $.proxy(this[override], this);
		}
	}

	/**
	 * Destroys the plugin.
	 * @protected
	 */
	Navigation.prototype.destroy = function() {
		var handler, control, property, override;

		for (handler in this._handlers) {
			this.$element.off(handler, this._handlers[handler]);
		}
		for (control in this._controls) {
			this._controls[control].remove();
		}
		for (override in this.overides) {
			this._core[override] = this._overrides[override];
		}
		for (property in Object.getOwnPropertyNames(this)) {
			typeof this[property] != 'function' && (this[property] = null);
		}
	}

	/**
	 * Updates the internal state.
	 * @protected
	 */
	Navigation.prototype.update = function() {
		var i, j, k,
			options = this._core.settings,
			lower = this._core.clones().length / 2,
			upper = lower + this._core.items().length,
			size = options.center || options.autoWidth || options.dotData
				? 1 : options.dotsEach || options.items;

		if (options.slideBy !== 'page') {
			options.slideBy = Math.min(options.slideBy, options.items);
		}

		if (options.dots || options.slideBy == 'page') {
			this._pages = [];

			for (i = lower, j = 0, k = 0; i < upper; i++) {
				if (j >= size || j === 0) {
					this._pages.push({
						start: i - lower,
						end: i - lower + size - 1
					});
					j = 0, ++k;
				}
				j += this._core.mergers(this._core.relative(i));
			}
		}
	}

	/**
	 * Draws the user interface.
	 * @todo The option `dotData` wont work.
	 * @protected
	 */
	Navigation.prototype.draw = function() {
		var difference, i, html = '',
			options = this._core.settings,
			$items = this._core.$stage.children(),
			index = this._core.relative(this._core.current());

		if (options.nav && !options.loop && !options.navRewind) {
			this._controls.$previous.toggleClass('disabled', index <= 0);
			this._controls.$next.toggleClass('disabled', index >= this._core.maximum());
		}

		this._controls.$previous.toggle(options.nav);
		this._controls.$next.toggle(options.nav);

		if (options.dots) {
			difference = this._pages.length - this._controls.$indicators.children().length;

			if (options.dotData && difference !== 0) {
				for (i = 0; i < this._controls.$indicators.children().length; i++) {
					html += this._templates[this._core.relative(i)];
				}
				this._controls.$indicators.html(html);
			} else if (difference > 0) {
				html = new Array(difference + 1).join(this._templates[0]);
				this._controls.$indicators.append(html);
			} else if (difference < 0) {
				this._controls.$indicators.children().slice(difference).remove();
			}

			this._controls.$indicators.find('.active').removeClass('active');
			this._controls.$indicators.children().eq($.inArray(this.current(), this._pages)).addClass('active');
		}

		this._controls.$indicators.toggle(options.dots);
	}

	/**
	 * Extends event data.
	 * @protected
	 * @param {Event} event - The event object which gets thrown.
	 */
	Navigation.prototype.onTrigger = function(event) {
		var settings = this._core.settings;

		event.page = {
			index: $.inArray(this.current(), this._pages),
			count: this._pages.length,
			size: settings && (settings.center || settings.autoWidth || settings.dotData
				? 1 : settings.dotsEach || settings.items)
		};
	}

	/**
	 * Gets the current page position of the carousel.
	 * @protected
	 * @returns {Number}
	 */
	Navigation.prototype.current = function() {
		var index = this._core.relative(this._core.current());
		return $.grep(this._pages, function(o) {
			return o.start <= index && o.end >= index;
		}).pop();
	}

	/**
	 * Gets the current succesor/predecessor position.
	 * @protected
	 * @returns {Number}
	 */
	Navigation.prototype.getPosition = function(successor) {
		var position, length,
			options = this._core.settings;

		if (options.slideBy == 'page') {
			position = $.inArray(this.current(), this._pages);
			length = this._pages.length;
			successor ? ++position : --position;
			position = this._pages[((position % length) + length) % length].start;
		} else {
			position = this._core.relative(this._core.current());
			length = this._core.items().length;
			successor ? position += options.slideBy : position -= options.slideBy;
		}
		return position;
	}

	/**
	 * Slides to the next item or page.
	 * @public
	 * @param {Number} [speed=false] - The time in milliseconds for the transition.
	 */
	Navigation.prototype.next = function(speed) {
		$.proxy(this._overrides.to, this._core)(this.getPosition(true), speed);
	}

	/**
	 * Slides to the previous item or page.
	 * @public
	 * @param {Number} [speed=false] - The time in milliseconds for the transition.
	 */
	Navigation.prototype.prev = function(speed) {
		$.proxy(this._overrides.to, this._core)(this.getPosition(false), speed);
	}

	/**
	 * Slides to the specified item or page.
	 * @public
	 * @param {Number} position - The position of the item or page.
	 * @param {Number} [speed] - The time in milliseconds for the transition.
	 * @param {Boolean} [standard=false] - Whether to use the standard behaviour or not.
	 */
	Navigation.prototype.to = function(position, speed, standard) {
		var length;

		if (!standard) {
			length = this._pages.length;
			$.proxy(this._overrides.to, this._core)(this._pages[((position % length) + length) % length].start, speed);
		} else {
			$.proxy(this._overrides.to, this._core)(position, speed);
		}
	}

	$.fn.owlCarousel.Constructor.Plugins.Navigation = Navigation;

})(window.Zepto || window.jQuery, window, document);

/**
 * Hash Plugin
 * @version 2.0.0
 * @author Artus Kolanowski
 * @license The MIT License (MIT)
 */
;(function($, window, document, undefined) {
	'use strict';

	/**
	 * Creates the hash plugin.
	 * @class The Hash Plugin
	 * @param {Owl} carousel - The Owl Carousel
	 */
	var Hash = function(carousel) {
		/**
		 * Reference to the core.
		 * @protected
		 * @type {Owl}
		 */
		this._core = carousel;

		/**
		 * Hash table for the hashes.
		 * @protected
		 * @type {Object}
		 */
		this._hashes = {};

		/**
		 * The carousel element.
		 * @type {jQuery}
		 */
		this.$element = this._core.$element;

		/**
		 * All event handlers.
		 * @protected
		 * @type {Object}
		 */
		this._handlers = {
			'initialized.owl.carousel': $.proxy(function() {
				if (this._core.settings.startPosition == 'URLHash') {
					$(window).trigger('hashchange.owl.navigation');
				}
			}, this),
			'prepared.owl.carousel': $.proxy(function(e) {
				var hash = $(e.content).find('[data-hash]').andSelf('[data-hash]').attr('data-hash');
				this._hashes[hash] = e.content;
			}, this)
		};

		// set default options
		this._core.options = $.extend({}, Hash.Defaults, this._core.options);

		// register the event handlers
		this.$element.on(this._handlers);

		// register event listener for hash navigation
		$(window).on('hashchange.owl.navigation', $.proxy(function() {
			var hash = window.location.hash.substring(1),
				items = this._core.$stage.children(),
				position = this._hashes[hash] && items.index(this._hashes[hash]) || 0;

			if (!hash) {
				return false;
			}

			this._core.to(position, false, true);
		}, this));
	}

	/**
	 * Default options.
	 * @public
	 */
	Hash.Defaults = {
		URLhashListener: false
	}

	/**
	 * Destroys the plugin.
	 * @public
	 */
	Hash.prototype.destroy = function() {
		var handler, property;

		$(window).off('hashchange.owl.navigation');

		for (handler in this._handlers) {
			this._core.$element.off(handler, this._handlers[handler]);
		}
		for (property in Object.getOwnPropertyNames(this)) {
			typeof this[property] != 'function' && (this[property] = null);
		}
	}

	$.fn.owlCarousel.Constructor.Plugins.Hash = Hash;

})(window.Zepto || window.jQuery, window, document);


;(function(){
var project_data = {};
project_data["lang"]="ru_RU";
project_data["languageCode"]="ru";
project_data["countryCode"]="RU";
project_data["token"]="d0bda2942df62a07fa167faa2c9ec999";
project_data["coordinatesOrder"]="latlong";project_data["geolocation"] = {"longitude":31.014111,"latitude":52.424012,"isHighAccuracy":false,"city":"Гомель","region":"Гомельская область","country":"Беларусь","zoom":12};project_data["hosts"]={api:{main:'https:\/\/api-maps.yandex.ru\/',ua:'https:\/\/legal.yandex.ru\/maps_termsofuse\/?lang={{lang}}',maps:'https:\/\/maps.yandex.ru\/',services:{coverage:'https:\/\/api-maps.yandex.ru\/services\/coverage\/',geoxml:'https:\/\/api-maps.yandex.ru\/services\/geoxml\/',route:'https:\/\/api-maps.yandex.ru\/services\/route\/',regions:'https:\/\/api-maps.yandex.ru\/services\/regions\/',psearch:'https:\/\/psearch-maps.yandex.ru\/',search:'https:\/\/api-maps.yandex.ru\/services\/search\/'}},layers:{map:'https:\/\/vec0%d.maps.yandex.net\/tiles?l=map&%c&%l',sat:'https:\/\/sat0%d.maps.yandex.net\/tiles?l=sat&%c&%l',skl:'https:\/\/vec0%d.maps.yandex.net\/tiles?l=skl&%c&%l',pmap:'https:\/\/0%d.pvec.maps.yandex.net\/?l=pmap&%c&%l',pskl:'https:\/\/0%d.pvec.maps.yandex.net\/?l=pskl&%c&%l'},traffic:'https:\/\/jgo.maps.yandex.net\/',trafficArchive:'https:\/\/jft.maps.yandex.net\/'};project_data["layers"]={'map':{version:'4.51.1',scaled:true},'sat':{version:'3.251.0'},'skl':{version:'4.51.1',scaled:true},'pmap':{version:'1429650000',scaled:true},'pskl':{version:'1429650000',scaled:true}};var init=function(e,t){function r(e){this.browser=e,this.css=new i(this),this.graphics=new s}function i(t){function o(e){return typeof s[e]=="undefined"?s[e]=u(e):s[e]}function u(e){return a(e)||a(t.browser.cssPrefix+l(e))}function a(e){return typeof f().style[e]!="undefined"?e:null}function f(){return n||(n=e.createElement("div"))}function l(e){return e?e.substr(0,1).toUpperCase()+e.substr(1):e}function c(e){return r[e]&&o("transitionProperty")?h(r[e]):null}function h(e){var n=o(e);return n&&n!=e&&(n="-"+t.browser.cssPrefix.toLowerCase()+"-"+e),n}var n,r={transform:"transform",opacity:"opacity",transitionTimingFunction:"transition-timing-function",userSelect:"user-select",height:"height"},i={},s={};this.checkProperty=o,this.checkTransitionProperty=function(e){return typeof i[e]=="undefined"?i[e]=c(e):i[e]}}function s(){this.hasSVG=function(){return e.implementation&&e.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure","1.1")},this.hasCanvas=function(){var t=e.createElement("canvas");return!!("getContext"in t&&t.getContext("2d"))},this.hasVML=function(){var t=!1,n=e.createElement("div");n.innerHTML='<v:shape id="yamaps_testVML"  adj="1" />';var r=n.firstChild;return r&&(r.style.behavior="url(#default#VML)",t=r?typeof r.adj=="object":!0,n.removeChild(r)),this.hasVML=function(){return t},t}}function a(e,t,n){o=new l(e,this),u=new f(t);var r=new y(n);this.load=function(e,t,n,i){typeof t=="string"&&(t=[t]);var s=[],o;x(t,function(e){(o=u.byName[e])&&s.push(o)}),r.load(s,function(){c(e,s,function(){n&&n.call(i)})})}}function f(e){var t=this;this.byName={},this.byAlias={};for(var n in e)x(e[n],function(e){e={_LJ:e,type:n,alias:e[0].substr(0,2),name:e[0].substr(2)},t.byName[e.name]=t.byAlias[e.alias]=e});this.getDepends=function(e){if(!e._MJ){var n=e._LJ[1],r=[];if(n){var i,s;if(typeof n=="string"){i=[];for(var u=0,a=n.length;u<a;u+=2)i.push(n.substr(u,2));s="byAlias"}else i=n.call(e,o),s="byName";x(i,function(e){r.push(t[s][e])})}e._MJ=r}return e._MJ},this.execByType=function(e,t){x(e,function(e){var n=t[e.type];n&&n(e)})}}function l(e,t){for(var n in e)this[n]=e[n];this.load=function(){t.load.apply(t,arguments)}}function c(e,t,n){m(e,t,function(){p(),n()})}function d(e,t,n){v(t,function(){t.providedPaths&&x(t.providedPaths,function(t){T(e,t.path,t.data)}),n()})}function v(e,t){var n=e.execute;if(n)n.done?t():n.callbacks.push(t);else{n=e.execute={callbacks:[t]};var r={};m(r,u.getDepends(e),function(){function s(){n.done=!0,t.length&&(e.providedPaths=t),x(n.callbacks,function(e){e()})}var t=[],i=0;e.source(function(e,n){t.push({path:e.split("."),data:n})},function(e){i++,e(function(){i--,i||s()})},b,r,o),i||s()})}}function m(e,t,n){if(!t.length)n();else{var r=0,i=function(){++r==t.length&&n()};x(t,function(t){t.type=="css"?h(e,t,i):t.type=="js"?d(e,t,i):g(e,t,i)})}}function g(e,t,n){m(e,u.getDepends(t),n)}function y(n){function i(e){var t=[],n={},i;while(e.length)i=e.shift(),!n[i.name]&&!r[i.name]&&(n[i.name]=!0,t.push(i),e.push.apply(e,u.getDepends(i)));return t}function s(e,t){var n=[],i=function(e){n.push(e)};u.execByType(e,{css:i,js:i}),n.length?a(n,function(n){x(n,function(e){var t=u.byAlias[e[0]];r[t.name]=!0,t.source=e[1]}),u.execByType(e,{"package":function(e){r[e.name]=!0}}),t()}):t()}function a(e,r){var i=[];x(e,function(e){i.push(e.alias)}),i=i.join("");var s=n+"_"+i;t[s]?t[s].listeners.push(r):f(i,s,function(e){r(e),t[s]=undefined;try{delete t[s]}catch(n){}})}function f(r,i,s){var u=[s],a=function(e){x(u,function(t){t(e)}),u=null},f=e.createElement("script");f.charset="utf-8",f.async=!0,f.src=o.PATH+"combine.xml?modules="+r+"&jsonp_prefix="+n,u.push(function(){t.setTimeout(function(){f.parentNode.removeChild(f)},0)}),a.listeners=u,t[i]=a,e.getElementsByTagName("head")[0].appendChild(f)}var r={};this.load=function(e,t){e=e.slice(0),e=i(e),s(e,t)}}function b(e){var t=1,n=typeof arguments[t]=="function"?arguments[t++]:null;n&&w(e,n);var r=arguments.length;while(t<r)S(e.prototype,arguments[t++]);return e}function x(e,t){for(var n=0,r;r=e[n++];)t(r)}function T(e,t,n){var r=e,i=0,s=t.length-1,o;for(;i<s;i++)r=r[o=t[i]]||(r[o]={});r[t[s]]=n}function N(e,t){var n=e;t=t.split(".");var r=0,i=t.length-1;for(;r<i;r++){n=n[t[r]];if(!n)return undefined}return n[t[i]]}function C(i,s,o,u,f,l,c,h){function y(){if(g&&m){var e;while(e=v.shift())e[0].call(e[1]);v=[]}}function w(e){var n=N(t,h);n?n(d):t.setTimeout(function(){w(++e)},100*Math.pow(2,e))}!u,u.name=="MSIE"&&(e.documentMode?u.documentMode=e.documentMode:u.documentMode=e.compatMode=="BackCompat"?0:7),u.transformTransition=u.name=="MSIE"&&u.documentMode>=10||u.engine=="WebKit"&&u.osFamily=="iOS",u.css3DTransform=u.engine=="WebKit"&&!(u.osFamily=="Android"&&parseFloat(u.osVersion)<3)||u.engine=="Gecko"&&parseInt(u.engineVersion.split(".")[0])>=10;var p=new a({PATH:s,DEBUG:o,support:new r(u),data:l},n,c),d={};T(t,i.split("."),d),d.load=function(e,t,n){p.load(d,e,t,n)};var v=[],m=e.readyState=="complete",g=!f;if(!m){function b(){m||(m=!0,y())}e.addEventListener?(e.addEventListener("DOMContentLoaded",b,!1),t.addEventListener("load",b,!1)):e.attachEvent&&t.attachEvent("onload",b)}f&&p.load(d,f.split(","),function(){g=!0,y(),h&&w(0)}),d.ready=function(e,t){v.push([e,t]),y()}}var n={"package":[["!!b-form-switch_type_switch",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["!*b-zoom__sprite",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["!(b-search",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["!)b-form-radio__button_checked_yes",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode==8?".ie8":e.support.browser.name=="MSIE"&&e.support.browser.documentMode<8?".ie":".standards")]}],["!,b-zoom__scale",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["!qb-traffic-panel__layer",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode==8?".ie8":e.support.browser.name=="MSIE"&&e.support.browser.documentMode<8?".ie":".standards")]}],["!jb-form-radio__button_side_both",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["!zb-form-button",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["!Qb-search-panel",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["!Jb-traffic-panel",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["!Zb-zoom__hint",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*ab-cluster-carousel",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*bb-traffic-panel__scale",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode==8?".ie8":e.support.browser.name=="MSIE"&&e.support.browser.documentMode<8?".ie":".standards")]}],["*cb-form-radio__button",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode==8?".ie8":e.support.browser.name=="MSIE"&&e.support.browser.documentMode<8?".ie":".standards")]}],["*db-search__input",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*eb-cluster-accordion",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*fb-select",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*gb-select__hint",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*hb-form-input_size_16",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*ib-form-switch_disabled_yes",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*kb-select_control_search",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode==8?".ie8":e.support.browser.name=="MSIE"&&e.support.browser.documentMode<8?".ie":".standards")]}],["*lb-select_control_traffic",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*mb-form-radio__button_disabled_yes",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*nb-form-button_theme_grey-19",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*ob-form-input__hint",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*pb-form-button_theme_grey-sm",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*rb-popupa",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*si-popup__under",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*tb-balloon",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*ub-form-checkbox_size_13",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*vb-form-button_theme_grey-22",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*wb-traffic-week",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode==8?".ie8":".standards")]}],["*xb-ico",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*yi-popup__under_color_white",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*Ab-form-switch_theme_switch-s",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode==8?".ie8":e.support.browser.name=="MSIE"&&e.support.browser.documentMode<8?".ie":".standards")]}],["*Bb-form-checkbox_disabled_yes",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*Cb-tip",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*Db-cluster-carousel_pager_numeric",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*Eb-form-radio",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode==8?".ie8":e.support.browser.name=="MSIE"&&e.support.browser.documentMode<8?".ie":".standards")]}],["*Fb-popupa__tail",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*Gb-listbox-panel",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode==8?".ie8":e.support.browser.name=="MSIE"&&e.support.browser.documentMode<8?".ie":".standards")]}],["*Hb-form-button_theme_simple-grey",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*Ib-form-button__input",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*Kb-form-radio_size_11",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*Lb-form-checkbox_checked_yes",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*Mb-form-checkbox_focused_yes",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*Nb-popupa__shadow",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode==8?".ie8":e.support.browser.name=="MSIE"&&e.support.browser.documentMode<8?".ie":".standards")]}],["*Ob-form-input",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*Pb-pseudo-link",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*Rb-form-checkbox",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode==8?".ie8":e.support.browser.name=="MSIE"&&e.support.browser.documentMode<8?".ie":".standards")]}],["*Sb-cluster-carousel_pager_marker",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*Tb-select_control_listbox",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*Ub-zoom",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*Vb-form-button__click",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*Wb-poi-balloon-content",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*Xb-select__arrow",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*Yb-popupa_theme_ffffff",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*0b-ruler",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*1b-dropdown-button",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*2b-select__pager",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*3b-form-switch",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*4i-popup__under_type_paranja",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*5b-select_search",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*6b-form-input__clear",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*7b-select_type_prognos",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*8b-form-button_theme_grey-no-transparent-26",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*9b-select__panel-switcher",function(e){return[this.name+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["*$package.geoXml","(t(R"],["*-package.controls","(u(S"],["*_package.editor","(v(T"],["*.package.overlays","979-9_9.9$666867656_6$6-696.6361626Y64(x"],["*!package.clusters","(y(V"],["**package.search","(A(W"],["*(package.geocode","3R9d9f9e(9(5"],["*)package.geoQuery","3S5N"],["*,package.route","(D(0(B(X**"],["*qpackage.full","(G(2"],["*jpackage.map","(H(Q"],["*zpackage.standard","(K(3"],["*Qpackage.traffic","(L(4"],["*Jpackage.regions","30"],["*Zpackage.geoObjects","(M(5"],["(apackage.geometries","929496959893979-9_9.9$9I9L9M9N9K"],["(bpackage.hotspots","57-D-C54598(55-u-y-A-v-w-B(d(_-(-5"],["(cpackage.tileContainer","7h7f7i7k"],["(dpackage.layouts","38$T5T"],["(epane.GlassPane.css",function(e){var t=[];return(e.support.browser.name=="MSIE"||e.support.browser.name=="IEMobile")&&t.push(["pane.GlassPane.css-ie"]),t}],["(fmap.copyrights.css",function(e){return e.support.browser.name=="MSIE"&&e.support.browser.documentMode<8?["map.copyrights.css.ie"]:["map.copyrights.css.standards"]}],["(gpane.events","51"],["(hpane.graphics",function(e){return e.support.browser.transformTransition?["pane.graphics.TransitionPane"]:["pane.graphics.StepwisePane"]}],["(ipane.controls","5W"],["(kpane.copyrights","5X"],["(lpane.overlays",function(e){return e.support.browser.transformTransition?["pane.overlay.TransitionPane"]:["pane.overlay.StepwisePane"]}],["(mpane.shadows",function(e){return e.support.browser.transformTransition?["pane.shadow.TransitionPane"]:["pane.shadow.StepwisePane"]}],["(npane.floats","52"],["(opane.movableOuters",function(e){return e.support.browser.transformTransition?["pane.movableOuter.TransitionPane"]:["pane.movableOuter.StepwisePane"]}],["(ppane.outers","53"],["(rpane.glass","50"],["(spane.layers",function(e){return e.support.browser.transformTransition?["pane.layer.TransitionPane"]:["pane.layer.StepwisePane"]}],["(tpackage.geoXml.core","$Q(w(C349u7q7*7(7!73755a"],["(upackage.controls.core","4V42404Y7V7W4-70484.4!$j5I$(-k$z5K474$4X44435K9p"],["(vpackage.editor.core","(M$o$r$s74$o$r$s"],["(wpackage.mapHint.core","9r(d3O"],["(xpackage.staticGraphicsOverlays","6W6U6V6X6T"],["(ypackage.clusters.core","8C.u5m(d(C(w(9-."],["(Apackage.search.core","*(9p459u9I7q7*-e73755a"],["(Bpackage.routeEditor.core","(D72465H"],["(Cpackage.mapBalloon.core","9t(d3V"],["(Dpackage.route.core","3T$Q(w(C9u7q7*7(7!73755a"],["(Epackage.private.yandex.enterprise","5."],["(Fpackage.behaviors.base","5D-$5I-k5B(1"],["(Gpackage.full.core","(K(y(v(L(t(M(D(B*)(a*.(b*J3N5v6B3H343R3G3Q5v"],["(Hpackage.map.core","(j3G3H3W5,9w9y9C3j3,3(3)6v$y3P5L4O3I3J3Q3N5v(F6c5O3X5M6L6M313Y6B3U5u5p5s5t5o5r4r4K4s4o4t4n4f7N7O7P"],["(Ipackage.map.css",function(e){return["map.css","map.css."+{en:"en",ru:"ru",tr:"en",uk:"ru"}[e.data.lang.substr(0,2)]+(e.support.browser.name=="MSIE"&&e.support.browser.documentMode<9?".ie":".standards")]}],["(Kpackage.standard.core","*j(u(A(9(C(w5c5f(d(b(c"],["(Lpackage.traffic.core","4_-C-D9)9z9,9p9I7q7*$Q73755a9u"],["(Mpackage.geoObjects.core","5d5c5f(9(7(8(6($$Z-g-b$Q7Z(d"],["(Ngraphics.render.detect.bestMatch",function(e){return e.support.graphics.hasCanvas()&&e.support.browser.name!="MSIE"&&e.support.browser.name!="IEMobile"?["graphics.render.canvas.Shapes"]:e.support.graphics.hasSVG()?["graphics.render.svg.Shapes"]:e.support.graphics.hasVML()?["graphics.render.vml.Shapes"]:[]}],["(Ographics.render.detect.all",function(e){var t=[];return e.support.graphics.hasCanvas()&&t.push("graphics.render.canvas.Shapes"),e.support.graphics.hasSVG()&&t.push("graphics.render.svg.Shapes"),e.support.graphics.hasVML()&&t.push("graphics.render.vml.Shapes"),t}],["(Ptheme.twirl.label.css",function(e){return e.support.browser.name=="MSIE"&&e.support.browser.documentMode<8?["theme.twirl.label.css.common","theme.twirl.label.css.ie"]:["theme.twirl.label.css.common"]}],["(Rpackage.geoXml.theme.twirl",".s(Y(U"],["(Spackage.controls.theme.twirl","-3"],["(Tpackage.editor.theme.twirl","(5-z"],["(Upackage.mapHint.theme.twirl","-q-5"],["(Vpackage.clusters.theme.twirl","-.(Y(U"],["(Wpackage.search.theme.twirl","-8.t(Y(U"],["(Xpackage.routeEditor.theme.twirl","--.t(Y(U"],["(Ypackage.mapBalloon.theme.twirl","-("],["(0package.route.theme.twirl",".s(Y(U4z"],["(1package.behaviors.base.dynamic","5D-$5I-k5B5E-h5F"],["(2package.full.theme.twirl","(3(V(T(5(4(R(0(X-$.s-(-q-5-3(_"],["(3package.standard.theme.twirl","(W(S(Y(U.t"],["(4package.traffic.theme.twirl","_n_i_l!h!l!k!A.t(Y(U!m!i.O!g!c"],["(5package.geoObjects.theme.twirl",".s(Y(U"],["(6package.geoObjects.rectangle","(C(w9K8b7j7_-a73755a9u"],["(7package.geoObjects.polyline","(C(w9L8c7Q7!-c73755a9u"],["(8package.geoObjects.polygon","9u(C(w8d9M7z7(-d73755a"],["(9package.geoObjects.placemark","9u(C(w8e9I7q7*-e73755a3937"],["($package.geoObjects.circle","(C(w9N8f7J7)-f73755a9u"],["(-theme.twirl.control.layouts.core",".-!o.a_J.8.9.c.d.*.b_Z.f"],["(_theme.twirl.hotspot.meta.full",".w.v"],["(.control.minimap.css",function(e){return e.support.browser.name=="MSIE"&&e.support.browser.documentMode<8?["control.minimap.css.ie"]:e.support.browser.name=="MSIE"&&e.support.browser.documentMode==8?["control.minimap.css.ie8"]:["control.minimap.css.common"]}],["(!theme.twirl.clusterNightContent.css","!B"],["(*theme.twirl.cluster.default.css",function(e){return e.support.browser.msie&&e.support.browser.documentMode<8?["theme.twirl.cluster.default.common.css","theme.twirl.cluster.default.ie.css"]:["theme.twirl.cluster.default.common.css"]}],["((traffic.balloon.tip.css",function(e){return e.support.browser.name=="MSIE"&&e.support.browser.documentMode<8?["traffic.balloon.tip.css.common","traffic.balloon.tip.css.ie","traffic.balloon.tip.theme.css"]:["traffic.balloon.tip.css.common","traffic.balloon.tip.theme.css"]}],["()traffic.balloon.layout.css",function(e){return e.support.browser.name=="MSIE"&&e.support.browser.documentMode<8?["traffic.balloon.layout.css.common","traffic.balloon.layout.css.ie"]:["traffic.balloon.layout.css.common"]}],["(,traffic.balloon.infoLayout.css",function(e){return e.support.browser.name=="MSIE"&&e.support.browser.documentMode<8?["traffic.balloon.infoLayout.css.common","traffic.balloon.infoLayout.css.ie"]:["traffic.balloon.infoLayout.css.common"]}],["(qtraffic.balloon.tip.theme.css","!6!4!5!3"],["(jtheme.browser.current",function(e){var t=e.support.browser,n=t.documentMode,r=t.engine.toLowerCase(),i=["theme.browser.common"];if(t.name=="MSIE"&&n>=10&&t.osVersion>6.1||t.name=="IEMobile"&&t.engineVersion>=6)i.push("theme.browser.pointer.ie10");else if(t.multiTouch)i.push("theme.browser.touch.common"),t.engine=="WebKit"&&i.push("theme.browser.touch.webkit");else switch(t.engine){case"WebKit":i.push("theme.browser.desktop."+(t.name=="Safari"?"safari":r));break;case"Gecko":case"Presto":i.push("theme.browser.desktop."+r);break;default:t.name=="MSIE"?i.push("theme.browser.desktop.ie"+(n?Math.min(9,Math.max(n,7)):7)):i.push("theme.browser.unknown")}return i}],["(ztheme.twirl.balloon.css",function(e){var t="theme.twirl.balloon.css.",n="",r=e.support.browser;if(r.name=="IEMobile")n=[t+"ie9"];else if(r.name=="MSIE")var i=Math.max(r.documentMode,7),n=[t+"ie"+(i>9?9:i)];else n=[t+"standards"];return n}],["(Qpackage.map.yandex.layers",function(e){var t={map:"Map",sat:"Satellite",skl:"Skeleton"},n={map:["map"],satellite:["sat"],hybrid:["sat","skl"]};if(e.data.restrictions&&e.data.restrictions.prohibitedLayers){var r=e.data.restrictions.prohibitedLayers.split(",");for(var i=0,s=r.length;i<s;i++)delete t[r[i]]}var o=["MapType","mapType.storage","layer.storage","yandex.mapType.metaOptions","package.hotspots"];for(var s in t)t.hasOwnProperty(s)&&o.push("yandex.layer."+t[s]);for(var u in n)if(n.hasOwnProperty(u)){var a=n[u];for(var i=0,s=a.length;i<s;i++)if(!t[a[i]])break;i==s&&o.push("yandex.mapType."+u)}return o}]],js:[["0atraffic.layout.control.Header.html","!z*I*V0B1,1l1H*n0o*80b0y*x"],["0dtip.layout.html","*C"],["0elistbox.layout.content.html","*f"],["0mclusterCarousel.layout.pager.html","1U*a*S*D"],["0ttraffic.layout.control.archive.PanelFoot.html","!J0A"],["0uballoon.layout.html","*t1u"],["0vtraffic.layout.control.archive.timeLine.html","!J*b*r*N*Y08*s0n*y*4*F0p"],["0xlistbox.layout.checkbox.html","*G*u*L*R*B*M"],["0CclusterTabs.layout.html","1U0O"],["0Ftraffic.layout.control.archive.stateHint.html","!J0P"],["0TpoiBalloonContent.layout.html","*W0R"],["0XclusterAccordion.layout.itemTitle.html","1U*e0M1C"],["02balloon.layout.content.html","*t1u"],["06search.layout.pager.html","*f*2*g*k*5*P!(!Q23"],["0.clusterCarousel.layout.html","1U*a*S*D"],["0*traffic.layout.control.ChooseCity.html","!J0A"],["0(traffic.layout.control.archive.OpenedPanelContent.html"],["0ztraffic.layout.control.prognos.oneDay.html","*G*u*L*R*B*M"],["1bzoom.layout.html","*U!*!,2j!z*I*V0B1,1l1H*n0o*80b3e*p"],["1fsearch.layout.form.html","*P!(*d05*O*o3f*h*61c1j!z*I*V0B1,1l1H*n0o*80b"],["1hbutton.layout.html","!z*I*V0B1,1l1H*n0o*80b0y"],["1mtraffic.layout.control.archive.TimeDay.html","*c!)2W*m!j*E*K*w"],["1nlistbox.layout.separat.html","*G*u*L*R*B*M"],["1wclusterTabs.layout.content.html","1U0O"],["1xlistbox.layout.item.html","*G*u*L*R*B*M"],["1Ntraffic.layout.control.actual.ServicesList.html","!J!q*u*L*R*B*M"],["1PtrafficBallonLevel.layout.html","2Z*P"],["1StrafficBallonTip.layout.html","2Z0r1i"],["11placemark.layout.html","1v1_"],["12zoom.layout.hint.html","*U!Z"],["15traffic.layout.control.Switcher.html","*32q*i3n!!*A"],["19clusterCarousel.layout.pagerItem.html","1U*a*S*D"],["1-search.layout.item.html","231a"],["1.traffic.layout.control.prognos.timeLine.html","!J*b*r*N*Y08*s0n*y*4*F0p"],["1)traffic.layout.control.prognos.onTheNearestTime.html","*G*u*L*R*B*M"],["1Qsearch.layout.popup.html","*r*N*Y08*s0n*y*4*f*g*9!Q"],["2bsearch.layout.html","*f*g*2*P!(!Q23*k*5"],["2cclusterAccordion.layout.html","1U*e0M1C"],["2druler.layout.html","*0*C"],["2itraffic.layout.control.prognos.selectButton.html","!z*I*V0B1,1l1H*n0o*80b2y*v*f*X"],["2ktraffic.layout.control.points.html","!J3v"],["2otraffic.layout.control.archive.weekDays.html","*c!)2W*m!j*E*K*w"],["2tclusterAccordion.layout.itemContent.html","1U*e0M1C"],["2Dtraffic.layout.control.prognos.html","*f*7*r*N*Y08*s0n*y*4*G*u*L*R*B*M"],["2Mruler.layout.content.html","*0*C"],["2RclusterTabs.layout.menu.html","1U0O"],["2Ttraffic.layout.control.Body.html","*r*N*Y08*s0n*y*4!J"],["24dropdownbutton.layout.html","*1"],["26button.layout.text.html","*x"],["2_clusterTabs.layout.menuItem.html","1U0O"],["2!clusterAccordion.layout.Item.html","1U*e0M1C"],["2)listbox.layout.button.html","!z*I*V0B1,1l1H*n0o*80b"],["2zlistbox.layout.html","*f*X*T!z*I*V0B1,1l1H*n0o*80b*r*N*Y08*s0n*y*4*G*u*L*R*B*M"],["2Jballoon.layout.closeButton.html","*t1u"],["3ctraffic.layout.control.archive.timeControl.html"],["3lballoon.layout.Shadow.html","*t1u"],["3rclusterCarousel.layout.contentItem.html","1U*a*S*D"],["3ytraffic.layout.html","*f*9*X*F2U*l"],["3DtrafficBallonInfo.layout.html","2Z0D0R"],["3Ggeolocation"],["3Hformatter","8k5h"],["3ILayer","4n4K7s4f4c6G5L(s7l7e7d3X"],["3KTemplate","4U4s4T"],["3LMapEventController","3Y"],["3MCluster","4K4r5O5k5L6G315n6c3X8E4Z4r4S"],["3NMapType"],["3OHint","7N4g4n4s316L5O8U9I685w4d"],["3PCollection","4K5L4n8I"],["3Rgeocode","9d5,"],["3SgeoQuery","5N"],["3Troute","4,4*4o"],["3UgetZoomRange","3J3Q5v"],["3VBalloon","4r7N4g316L5O3X9I669y4d4T"],["3WMap","(I5z5Z5)5*5,5Q9x9D9B9i4n3Y(g6G3L6B4d5r5v9y9A5O5(4r3J3Q(j4c4r7C7m7N4H"],["3XMonitor","4s4n4T"],["3YMapEvent","4K316u8N"],["30regions","4x4B4o4K4U9n4c5d5f(8-g8u"],["31Event"],["32geoXml.util","5M"],["33geoXml.getJson","4x4o"],["34geoXml.load","33.m$L$K$M$N324o"],["35overlay.optionMapper","5P"],["36overlay.storage","4t"],["37layout.ImageWithContent","4K3K39$T38"],["38layout.storage","4t"],["39layout.Image","5T387t7s3X6B4f4N"],["3$graphics.Shape","4K6(4L3_"],["3-graphics.CSG","7N4L3_4r"],["3_graphics.Path","4L4r"],["3.graphics.Representation","4s4r3_"],["3!graphics.renderManager","7s7t4p4U7s7t4I4u4r"],["3*projection.idle"],["3(projection.sphericalMercator","3j"],["3)projection.Cartesian","7O$A"],["3,projection.wgs84Mercator","3j"],["3qprojection.Mercator","7P7O"],["3jprojection.GeoToGlobalPixels","3q6v7O"],["3zprojection.zeroZoom"],["3Qlayer.storage","4t"],["3JLayerCollection","3P3Q4K4n4o5x5A"],["3Zlayer.optionMapper","5P"],["4aconstants.hotspotManagerTimeout"],["4bconstants.hotspotEvents"],["4cconstants.zIndex"],["4dconstants.mapDomEvents"],["4econstants.mapListenerPriority"],["4futil.hd"],["4gutil.once"],["4hutil.safeAccess"],["4iutil.geoBounds","4r7O"],["4kutil.nodeSize","4s7t7s4s$07o7s4u$_$9"],["4lutil.EventPropagator"],["4mutil.EventSieve","4n"],["4nutil.bind"],["4outil.Promise"],["4putil.Associate","4U"],["4rutil.bounds","3,7O4S4s"],["4sutil.extend"],["4tutil.Storage"],["4uutil.scheduler","4U4n$8$6"],["4vutil.fireWithBeforeEvent","4s31"],["4wutil.eventId","4U"],["4xutil.jsonp","4U4H4o8u"],["4yutil.json"],["4Autil.tremorer"],["4Butil.base64"],["4Cutil.ImageLoadObserver","6L6B317t4U$)"],["4Dutil.mbr","4r"],["4Eutil.getPixelRadius"],["4Futil.ContentSizeObserver","6L314C4k"],["4Gutil.Chunker","4n4s"],["4Hutil.script"],["4Iutil.List","4U"],["4Kutil.augment","4s"],["4Lutil.vector","7N"],["4Mutil.data","4U"],["4Nutil.imageLoader","6B4u$9"],["4Outil.Dragger","7o4s7v6L6B"],["4Putil.instantCache"],["4Rutil.callbackChunker","4n4s4p$_"],["4Sutil.correctMargin"],["4Tutil.array"],["4Uutil.id"],["4Vcontrol.factory","4K499k"],["4Wcontrol.Selectable","4K49"],["4Xcontrol.TypeSelector","4K4Y7V5v8u414T9k425,4n"],["4Ycontrol.ListBox","4U4K7Y9k4k"],["40control.RadioGroup","4K7X38"],["41control.storage","4t"],["42control.Group","4K7Y38"],["43control.ZoomControl","4K44419k3X"],["44control.SmallZoomControl","4K7P49(i419k"],["45control.SearchControl","4K4s4n4o4T3R498u5R9d419k3X9o"],["46control.RouteEditor","4K$q8u419k"],["47control.MiniMap","494K4s419k5,3X"],["48control.Button","4K4W9k"],["49control.Base","4K5L6c38319k4n4T4R4U7o3X"],["4$control.ScaleLine","4K49419k"],["4-control.ToolBar","4K4U42"],["4_control.TrafficControl","6l4K6o6f49414H7s9k4n"],["4.control.RollupButton","4K4T7X7U9k4n"],["4!control.MapTools","4K4T4-4041719k"],["4*router.util","4o4x4T4s7y4i4r4j3,4)3R"],["4(router.Editor","3T4s4*5O6L6c6f_)_!_q_(_,_*"],["4)router.restrict","4T"],["4,router.Route","5O6c316L6G777-78795f5d4s4Q4q4*3H"],["4qrouter.Path","4K7O9S4T5d3H"],["4jrouter.Segment","6c8u5h3H"],["4zrouter.preset","5M5T7O4s5t5d9o"],["4Qrouter.ViaPoint","4K5d"],["4JgeoObject.geometryFactory","4t9I9L9M9K9N"],["4ZgeoObject.optionMapper","5P"],["5ageoObject.metaOptions","5s5,"],["5bgeoObject.Hint","4n4g6L4Z3*"],["5cGeoObjectCollection","6G5O4Z6c316L777-787976"],["5dGeoObject","6G316L5O4Z6c777-78"],["5egeoObject.Balloon","4n4s6L7.5R4Z3*"],["5fGeoObjectArray","6G5O4Z6c316L777-787$76"],["5ggeoObject.View","4n4T4R4v4O313Y5O5P3X7,8g4c5r7Z"],["5hlocalization.lib"],["5iclusterer.util","4r7N"],["5kcluster.optionMapper","5P"],["5lcluster.Balloon","4n6L317.5k5R3*6c"],["5mClusterer","4s4r3M5i8D4I4K6c9I3P4K4n4U3X4T8E4g4Z6L4S"],["5ncluster.View","676L3Y5r4d"],["5ointeractivityModel.layer","5r4s5u"],["5pinteractivityModel.opaque","4d5r"],["5rinteractivityModel.storage","4t"],["5sinteractivityModel.geoObject","4d5r"],["5tinteractivityModel.transparent","4d5r"],["5uinteractivityModel.map","4d5r"],["5vmapType.storage","4t"],["5whint.fitPane","7t7r4k"],["5xcomponent.ProviderObserver","4T4U4o"],["5ycomponent.EventFreezer"],["5Acomponent.ZoomRangeObserver","5x4K4o"],["5Bbehavior.DblClickZoom","5D5C7P7A4e9v"],["5Cbehavior.factory","5L4K4s5O"],["5Dbehavior.storage","4t"],["5Ebehavior.ScrollZoom","7A5G5D5C9v7R"],["5Fbehavior.MultiTouch","5D5C8P9v"],["5Gbehavior.action","4n4K9C"],["5Hbehavior.RouteEditor","5D5C9v4,4T4n3T9o"],["5Ibehavior.Drag","5D5G4O7S$!5C9v5R"],["5Kbehavior.Ruler","4c4e4h4K4s4T(l(h5Y3!5C5D8S$y9L5d9o-e3z8u3Y"],["5Lcollection.Item","6L318G315O"],["5Moption.presetStorage","4t"],["5NGeoQueryResult","4s4I4o4n7K5m4T4r-r-p-n-m-o-s5d"],["5Ooption.Manager","4s8F5M$H31"],["5Poption.Mapper","6L31"],["5Roption.Monitor","4n"],["5TtemplateLayoutFactory","5U"],["5UTemplateLayoutFactory","4K4s$T3K6h6g"],["5Vpane.StaticPane","7s6L7t"],["5Wpane.ControlPane","8Y5V4c5Y4K"],["5Xpane.CopyrightsPane","4K5V4c5Y"],["5Ypane.storage","4t"],["50pane.GlassPane","4K7t4s5V4c6B5Y(e7G"],["51pane.EventPane","4K505Y4c"],["52pane.FloatPane","4K5V7t5Y4c"],["53pane.OuterPane","4K5V7t5Y7r5V4c"],["54hotspot.loader","4s4n4x"],["55hotspot.Shape","6L5O-u"],["56hotspot.counter"],["57hotspot.Layer","8,3Y316G4n9s8_5L4K3Z"],["58hotspot.Manager","9E6L3Y5$4b5r5s"],["59hotspot.ObjectSource","4G4n54555r5o6L-w-A-v5O9_9$99"],["5$hotspot.ContainerList","4I4U7N6L314s565r5s4n"],["5-yandex.dataProvider","5_4o4s"],["5_yandex.coverage","4x4o"],["5.yandex.enterprise.enable","9h4)-F7i5,8J9*"],["5!yandex.layers"],["5*map.ZoomRange","6L4n4o3X7N5A"],["5(map.optionMapper","5P"],["5)map.Copyrights","5x9m(k6L6c4o4n5v3,3("],["5,map.metaOptions","5O3,5u"],["5qmap.Hint","4n4g7s6L3O5("],["5zmap.Container","7s7t7r6L3X6B314n7N4H"],["5Qmap.event.Manager","6M3Y4K4s"],["5Jmap.Balloon","4n4g7s6L3V5("],["5Zmap.Converter"],["6amap.GeneralCollection","5O6L3179"],["6bmap.GeoObjects","316a4K79765(4Z"],["6cdata.Manager","4K4s9!4T4h"],["6ddata.Proxy","6c4K"],["6edata.Mapper","4s"],["6fdata.Monitor","6L4n31"],["6gdata.Aggregator","4K6c"],["6hdata.Adapter","4K9!"],["6itraffic.loader","543W"],["6ktraffic.weekDays"],["6ltraffic.constants"],["6mtraffic.timeZone","5-6l4n"],["6ntraffic.regionData","4n4T4x4o"],["6otraffic.provider.storage","4t"],["6ptraffic.balloonDataSource","4s"],["6rtraffic.MultiSource","9J544K6n"],["6straffic.AutoUpdater"],["6tmapEvent.override.common","316u"],["6umapEvent.overrideStorage","4t"],["6vcoordSystem.geo","7O"],["6wdomEvent.TouchMapper","4s4n6F7N_26y6A_46x5,"],["6xdomEvent.isEnterLeavePrevented","314U7n4P6B"],["6ydomEvent.Touch","4K_$_08N"],["6AdomEvent.MultiTouch","4K_$_18N"],["6BdomEvent.manager","4U6F4M$H$F_6"],["6CdomEvent.MultiPointer","4K_$_88N"],["6DdomEvent.Pointer","4K_$_98N"],["6EdomEvent.PointerMapper","4s6D6C6x5,4n"],["6FDomEvent","4K_$__8N"],["6Gevent.globalize","4p6L"],["6Hevent.Group"],["6Ievent.PriorityGroup","$F"],["6Kevent.MappingManager","4K6L"],["6Levent.Manager","4K$H314s"],["6Mevent.PriorityManager","4s4I$H6I314g"],["6NgeoXml.preset.gpx","5M9S8u6v9S4s5h3H7s6L5O"],["6Ooverlay.component.CursorManager","4s7G5R"],["6Poverlay.component.DomView","4s7N7s7t4u5O3X38(l(m(p(o(n"],["6Roverlay.component.Interactivity","3X5r3L31"],["6Soverlay.Base","4s6L355O3X"],["6Toverlay.staticGraphics.Rectangle","$O4K3$36"],["6Uoverlay.staticGraphics.Polyline","$O4K3$36"],["6Voverlay.staticGraphics.Polygon","$O4K3$363-3_9_9-"],["6Woverlay.staticGraphics.Placemark","$O676S4K4s3$369$396f$W"],["6Xoverlay.staticGraphics.Circle","$O4K3$36"],["6Yoverlay.hotspot.Rectangle","4K6036-w"],["60overlay.hotspot.Base","4K8*6S6R6O555s"],["61overlay.hotspot.Polyline","4K6036-y"],["62overlay.hotspot.Polygon","4K6036-A"],["63overlay.hotspot.Placemark","4K9$6036-w"],["64overlay.hotspot.Circle","4K6036-B"],["65overlay.html.Rectangle","4K7t9$6S366R6P6O$P5s"],["66overlay.html.Balloon","4K7t31(m5O356S366R6P6O5p6f5O4T"],["67overlay.html.Placemark","4K7t5O35(m6S366R6P6O5s"],["68overlay.html.Label","4K7t6S366R6P6O5p"],["69overlay.interactiveGraphics.Rectangle","4K$S6Y36"],["6$overlay.interactiveGraphics.Polyline","4K$S6136"],["6-overlay.interactiveGraphics.Polygon","4K$S6236"],["6_overlay.interactiveGraphics.Placemark","4K$S3X629_36"],["6.overlay.interactiveGraphics.Circle","4K$S6436"],["6!layout.component.clientBounds","7t"],["6*layout.Base","4s316L6B4d4T"],["6(graphics.shape.base","4K4s7t4r6L313.6,"],["6)graphics.layout.blankIcon","4K"],["6,graphics.render.factory"],["6qgraphics.render.util","4T"],["6jgraphics.render.Base","4s7s7t4r4L6,6L317b6q4u$$$9$.4N4f"],["6zgraphics.render.SVG","4K4s6j7s7t"],["6Qgraphics.render.Canvas","4K4s6j7s7t4f4r"],["6Jgraphics.render.VML","4K4s6j7s7t"],["6Zgraphics.generator.stroke","4L3_"],["7agraphics.generator.simplify"],["7bgraphics.generator.clipper","3_7c7N"],["7cgraphics.generator.cohenSutherland"],["7dlayer.component.TilePositioner","7O"],["7elayer.component.TileSource","4f7O"],["7flayer.tile.DomTile","7s7t6B6L315O8u$Y4N7g"],["7glayer.tile.storage","4t"],["7hlayer.tile.CanvasTile","6L5O4N$!7s8u7g"],["7ilayer.tileContainer.CanvasContainer","4K7s7t7N7I$_5L7g7l7h"],["7klayer.tileContainer.DomContainer","4K7s7t7I5L7g7l7f"],["7llayer.tileContainer.storage","4t"],["7mutil.animation.getFlyingTicks"],["7nutil.dom.getBranchDifference"],["7outil.dom.className",function(t){return["util.dom.ClassName.byClass"+("classList"in e.createElement("a")?"List":"Name")]}],["7putil.dom.positionController","4U"],["7rutil.dom.viewport"],["7sutil.dom.element","7t"],["7tutil.dom.style","4s4T"],["7uutil.dragEngine.mouseTouch","316F6B4A"],["7vutil.dragEngine.current",function(e){var t,n=e.support.browser;return(n.name=="MSIE"||n.name=="IEMobile")&&n.documentMode<9?t="util.dragEngine.mouse":t="util.dragEngine.mouseTouch",[t]}],["7wutil.dragEngine.mouse","316F4A"],["7xutil.coordinates.encode","4B"],["7yutil.coordinates.decode","4B"],["7Autil.coordinates.scaleInvert"],["7Butil.coordinates.parse"],["7Cutil.coordinates.getClosestPixelPosition"],["7Dutil.css.selectorParser"],["7Eutil.css.selectorMatcher","7D"],["7Futil.cursor.storage","4t4s"],["7Gutil.cursor.Manager","4T7t7F7H6L"],["7Hutil.cursor.Accessor","6L"],["7Iutil.tile.Storage","6L31"],["7Kutil.ArrayIterator"],["7Lutil.math.calculateLineIntersection"],["7Mutil.math.geoBounds","4i"],["7Nutil.math.areEqual"],["7Outil.math.cycleRestrict"],["7Putil.math.restrict"],["7Rutil.math.getSign"],["7Sutil.math.cubicBezier"],["7Tcontrol.childElementController.Base","7p7s4k"],["7Ucontrol.childElementController.Rollup","7T3X4K7o"],["7Vcontrol.ListBoxItem","4K4W9k"],["7Wcontrol.ListBoxSeparator","4K499k"],["7Xcontrol.BaseRadioGroup","4K7Y"],["7Ycontrol.BaseGroup","4K4T418M7T49314n4U"],["70control.ToolBarSeparator","494K9k"],["71control.mapTools.storage","4t"],["72router.addon.editor","4,4("],["73geoObject.addon.balloon","314U5R5d5e3V3*"],["74geoObject.addon.editor","5d$p4Z4l"],["75geoObject.addon.hint","4U5R5d5b3O3*"],["76geoObject.component.BoundsAggregator","4s4n4r7N4r"],["77geoObject.component.castGeometry","4J"],["78geoObject.component.ObjectImplementation","314n5g8G"],["79geoObject.component.CollectionImplementation","4n318I"],["7$geoObject.component.ArrayImplementation","4n318M"],["7-geoObject.component.castProperties","6c"],["7_geoObject.balloonPositioner.rectangle","7.9S4r"],["7.geoObject.balloonPositioner.storage","4t"],["7!geoObject.balloonPositioner.lineString","7.9S"],["7*geoObject.balloonPositioner.point","7."],["7(geoObject.balloonPositioner.polygon","7.9T"],["7)geoObject.balloonPositioner.circle","7."],["7,geoObject.dragCallback.storage","4t"],["7qgeoObject.dragCallback.point","7,"],["7jgeoObject.dragCallback.rectangle","7,"],["7zgeoObject.dragCallback.polygon","7,"],["7QgeoObject.dragCallback.lineString","7,"],["7JgeoObject.dragCallback.circle","7,"],["7ZgeoObject.overlayFactory.storage","4t"],["8ageoObject.OverlayFactory","4K4t"],["8bRectangle","4K5d"],["8cPolyline","4K5d"],["8dPolygon","4K5d"],["8ePlacemark","4K5d"],["8fCircle","4K5d"],["8ggeoObject.view.overlayMapping","4s4t"],["8hlocalization.units.kk"],["8ilocalization.units.tr"],["8klocalization.units.current",function(e){return["localization.units."+e.data.lang.substr(0,2)]}],["8llocalization.units.be"],["8mlocalization.units.en"],["8nlocalization.units.ru"],["8olocalization.units.uk"],["8plocalization.units.tt"],["8rlocalization.units.cs"],["8slocalization.common.kk"],["8tlocalization.common.tr"],["8ulocalization.common.current",function(e){return["localization.common."+e.data.lang.substr(0,2)]}],["8vlocalization.common.be"],["8wlocalization.common.en"],["8xlocalization.common.ru"],["8ylocalization.common.uk"],["8Alocalization.common.tt"],["8Blocalization.common.cs"],["8Ccluster.addon.balloon","3M5l316f"],["8Dclusterer.Pipe","6L5O4I314U"],["8Eclusterer.optionMapper","5P"],["8Fcomponent.child.BaseChild"],["8Gcomponent.child.MapChild","8F"],["8Hcomponent.collection.BaseCollection","4I"],["8Icomponent.collection.ParentCollection","4n8H8K"],["8Kcomponent.parent.BaseParent","4s"],["8Lcomponent.array.BaseArray","4T"],["8Mcomponent.array.ParentArray","4n8L8K"],["8Ncomponent.event.Cacher"],["8Obehavior.MultiTouchEngine","4n4m4K-l"],["8Pbehavior.CurrentMultiTouchEngine",function(e){var t,n=e.support.browser;return n.name=="MSIE"&&n.documentMode>=10&&n.osVersion>6.1||n.name=="IEMobile"&&n.engineVersion>=6?t="behavior.MultiPointerEngine":t="behavior.MultiTouchEngine",[t]}],["8Rbehavior.MultiPointerEngine","4K-l"],["8Sbehavior.ruler.MarkerLayout","8T4K7N7s7t6*3X3H6h5O-,5T6B"],["8Uoption.monitor.Manager","4s5R"],["80pane.overlay.TransitionPane","4K4s864c5Y"],["81pane.overlay.StepwisePane","4K4s7t874c5Y"],["82pane.layer.TransitionPane","864c5Y4K"],["83pane.layer.StepwisePane","874c5Y4K"],["84pane.graphics.TransitionPane","804c5Y4K"],["85pane.graphics.StepwisePane","814c5Y4K"],["86pane.movable.TransitionPane","4s7s7t6B6L"],["87pane.movable.StepwisePane","4s7s7t6L4u$!"],["88pane.movableOuter.TransitionPane","4K4s7t864c5Y"],["89pane.movableOuter.StepwisePane","4K4s7t874c5Y"],["8$pane.shadow.TransitionPane","804c5Y4K"],["8-pane.shadow.StepwisePane","814c5Y4K"],["8_hotspot.layer.optionMapper","5P"],["8.hotspot.layer.Hint","6L314n4g9r8_3*5t4s4g"],["8!hotspot.layer.Balloon","4n316L9t3*4s8_"],["8*hotspot.overlayContainer","4p8(6L4K319s"],["8(hotspot.ShapeContainer","8)6L564U"],["8)hotspot.InternalShapeContainer","6L56314U4T"],["8,hotspot.LayerShapeContainer","8(6L314K7O7N"],["8qyandex.layer.Satellite","8j3Q3,5,8z"],["8jyandex.layer.factory","3I4K4s4o5-5!8u7s3X"],["8zyandex.layer.metaOptions","5,5(4s"],["8Qyandex.layer.Skeleton","8j3Q3,5,8z"],["8Jyandex.layer.Map","8j5!3Q5,3,"],["8Zyandex.mapType.satellite","8u5v3N5,"],["9ayandex.mapType.metaOptions","5,"],["9byandex.mapType.map","8u5v3N5,"],["9cyandex.mapType.hybrid","8u5v3N5,"],["9dyandex.geocodeProvider.storage","4t4o"],["9eyandex.geocodeProvider.metaOptions","5,9f"],["9fyandex.geocodeProvider.map","9d9g4o4x4i4T$L3,"],["9gyandex.searchToGeocodeConverter","4T4s"],["9hyandex.enterprise.layerRestriction","4s4T-E-G7s7t7i4f"],["9imap.layer.Manager","3J4K3Z5O5("],["9kmap.control.optionMapper","5P"],["9lmap.control.Manager","4K31(i-H42"],["9mmap.copyrights.Layout","4n7s7o(f5T$36f8u"],["9nmap.copyrights.counter","5)4U"],["9omap.associate.serviceGeoObjects","4p6b"],["9pmap.addon.controls","3W9l"],["9rmap.addon.hint","3W5q3Y"],["9smap.addon.hotspots","583W"],["9tmap.addon.balloon","3W5J3Y"],["9umap.addon.geoObjects","3W6b"],["9vmap.behavior.optionMapper","5P"],["9wmap.behavior.metaOptions","5,"],["9xmap.behavior.Manager","5D9v6a794K"],["9ymap.action.Single","4n4K-M6L"],["9Amap.action.Sequence","4s9y4n"],["9Bmap.action.Manager","6L4n4r7A7S4s"],["9Cmap.action.Continuous","4K-M"],["9Dmap.pane.Manager","5Y"],["9Emap.hotspot.Controller","4b"],["9Ftheme.browser.unknown","5,_3$C$B7k"],["9Gtheme.browser.common","5,_.6t"],["9Hgeometry.defaultOptions","3,"],["9Igeometry.Point","4K5O92979O.V.U9H"],["9Kgeometry.Rectangle","4K5O939$9O.T-J.V.U9U9Y9H9V$y9R"],["9Lgeometry.LineString","4K7x7y5O949-9O.T-Z.V.W_d.U9U$y9H9V"],["9Mgeometry.Polygon","4K7x905O959_9O.T_a.U.W_e.V9U$y9H9V9R"],["9Ngeometry.Circle","4K5O989.9O_b.V.U9H9V4E$y9R"],["9Ogeometry.component.RenderFlow","4s4T4n5O"],["9Pgeometry.component.FillRule"],["9Rgeometry.component.pixelContains"],["9Sgeometry.component.findClosestPathPosition","4L"],["9Tgeometry.component.pointInPolygon"],["9Ugeometry.component.ShortestPath","9Y7O"],["9Vgeometry.component.boundsFromPixels","4r"],["9Wgeometry.component.CoordPath"],["9Xgeometry.component.PixelGeometryShift","4r9Y"],["9Ygeometry.component.anchor"],["90geometry.component.closedPathDecode","7y"],["91geometry.component.ChildPath","4n4T"],["92geometry.base.Point","4s316L"],["93geometry.base.Rectangle","316L4s_f"],["94geometry.base.LineString","6L4s4n7x7y4r9S5y9W9192"],["95geometry.base.Polygon","6L4s4n7x5y909W919P_g96"],["96geometry.base.LinearRing","6L4s4n7x4r9T9S5y909W919P92"],["97geometry.pixel.Point","4s"],["98geometry.base.Circle","6L4s5y_h"],["99geometry.pixel.MultiPolygon","4s9_4r"],["9$geometry.pixel.Rectangle","4s_f"],["9-geometry.pixel.LineString","4s4r9S"],["9_geometry.pixel.Polygon","4s_g"],["9.geometry.pixel.Circle","4s_h"],["9!data.Base","4s4T$H315y"],["9*traffic.layer.Png","3I4K"],["9(traffic.provider.optionMapper","5P"],["9)traffic.provider.Actual","579*9k5(3X*Z6s6l9Q9j6o6n$a4K4n4x5-"],["9,traffic.provider.Forecast","57549*9k5(3X6s6l6r9j6o6n6m$b6k4K4n4x7O5-"],["9qtraffic.provider.layoutStorage","4t"],["9jtraffic.provider.Base","5O6c9(6L"],["9ztraffic.provider.Archive","6f57549*9k5(3X6l6r9j6o6n6m$d6k4K4n4s7O5-"],["9Qtraffic.ActualMultiSource","6r6l544K4H7s6n"],["9Jtraffic.BaseMultiSource","594K4n544T"],["9Ztraffic.view.optionMapper","5P"],["$atraffic.view.Actual","$c4K9q"],["$btraffic.view.Forecast","$c4K9q"],["$ctraffic.view.Base","6f4T3J9Z"],["$dtraffic.view.Archive","$c4K9q"],["$egeometryEditor.controller.Edge","4K_u_v"],["$fgeometryEditor.controller.Vertex","4K_u_w$l8u"],["$ggeometryEditor.controller.Point","4K_u_p_x"],["$hgeometryEditor.controller.PolygonPath","4K_t8u"],["$igeometryEditor.controller.LineString","4K_t_r8u"],["$kgeometryEditor.controller.Polygon","4K_u$h_s8u"],["$lgeometryEditor.Menu","4p3z5d4c9o"],["$mgeometryEditor.GuideLines","4p4L5O6h6U9-"],["$ngeometryEditor.component.SubEntityManager","4s"],["$ogeometryEditor.Point","4K_D$p_E$g$v"],["$pgeometryEditor.storage","4t"],["$rgeometryEditor.LineString","4s4K_D_G$i$w$p_y"],["$sgeometryEditor.Polygon","4s4K_D_F$k$x$p_y"],["$tgeometryEditor.view.Edge","4K$u8e$Q5s4c_B"],["$ugeometryEditor.view.Vertex","4K4s_X4r8e$Q5s4c_A$_"],["$vgeometryEditor.view.Point","4K_X"],["$wgeometryEditor.view.Path","4K_W$u$t$n"],["$xgeometryEditor.view.MultiPath","4K_W$w"],["$ycoordSystem.cartesian","$A"],["$AcoordSystem.Cartesian","4s"],["$BdomEvent.touch.override","_04P4U"],["$CdomEvent.multiTouch.override","_14U4P"],["$DdomEvent.multiPointer.override","_84U4P"],["$EdomEvent.pointer.override","_94P4U"],["$Fevent.ArrayGroup","4s"],["$Gevent.manager.Mixed","4s4U"],["$Hevent.manager.Base","4U4T4s$F4g"],["$Ievent.manager.Array","4s"],["$KgeoXml.parser.ymapsml.MapState","4T4o"],["$LgeoXml.parser.ymapsml.geoObjects","4T4s7y5f5d5M385T32.o"],["$MgeoXml.parser.gpx.geoObjects","5f5d8u5O6N"],["$NgeoXml.parser.kml.geoObjects","4T5f5d5M385T6B4o4N32"],["$Ooverlay.staticGraphics.Base","4K(h(N3!6S"],["$Poverlay.html.rectangle.Layout","4K7t7s4T6*6q3X"],["$Roverlay.interactiveGraphics.LoadingDispatcher","4s"],["$Soverlay.interactiveGraphics.Base","4K4h$R6S"],["$Tlayout.templateBased.Base","4K6*7s7t4s4T4n7N314F6L6c6g6f6!6B4d388u"],["$Ugraphics.render.svg.Shapes","4K4s6z$V7t4L"],["$Vgraphics.render.abstract.Shapes"],["$Wgraphics.render.canvas.Shapes","4K4s6Q$V6Z4N4f"],["$Xgraphics.render.vml.Shapes","4K4s6J$V7t4L"],["$1util.dom.ClassName.byClassName"],["$2util.dom.ClassName.byClassList"],["$3util.dom.reaction.hover","4s6B$5"],["$4util.dom.reaction.hold","4s6B4u$57t"],["$5util.dom.reaction.common","7o4s4u"],["$6util.scheduler.strategy.scheduled","4K$-$*"],["$7util.scheduler.strategy.quantum","4K$-$)"],["$8util.scheduler.strategy.storage","4t"],["$9util.scheduler.strategy.asap","4K$-$)"],["$$util.scheduler.strategy.now","4K$-"],["$-util.scheduler.strategy.base","$8"],["$_util.scheduler.strategy.Raf","4K$-$)"],["$.util.scheduler.strategy.background","4K$-$*"],["$!util.scheduler.strategy.processing","4K$-$*"],["$*util.scheduler.timescheduler","$_"],["$(control.mapTools.button.Magnifier","$,718u"],["$)util.scheduler.asap","4n4U6B"],["$,control.mapTools.behaviorButtonFactory","4K$q4s"],["$qcontrol.mapTools.behaviorButton","4K489k"],["$jcontrol.mapTools.button.Drag","$,718u48"],["$zcontrol.mapTools.button.Ruler","$,718u"],["$QgeoObject.overlayFactory.interactive","8a676$6-696.7Z"],["$JgeoObject.overlayFactory.htmlRectangle","8a65"],["$ZgeoObject.overlayFactory.staticGraphics","8a6W6U6V6X6T7Z"],["-ageoObject.overlayFactory.rectangle","8a69"],["-bgeoObject.overlayFactory.hotspot","8a6361626Y647Z"],["-cgeoObject.overlayFactory.polyline","8a6$"],["-dgeoObject.overlayFactory.polygon","8a6-"],["-egeoObject.overlayFactory.placemark","8a67"],["-fgeoObject.overlayFactory.circle","8a6."],["-ggeoObject.overlayFactory.interactiveGraphics","8a6_6$6-696.7Z"],["-hbehavior.RightMouseButtonMagnifier","5C-i5D9v"],["-ibehavior.magnifier.mouse.Component","659$6B4O4c503X"],["-kbehavior.LeftMouseButtonMagnifier","5C-i5D9v"],["-lbehavior.BaseMultiEngine","4e5G6F7P7A"],["-mgeoQueryResult.component.intersect","3,6v$y4i7L-n-p"],["-ngeoQueryResult.component.distance","4n4L7L4T9S-s6v$y9L"],["-ogeoQueryResult.component.util"],["-pgeoQueryResult.component.contain","3,4i-s-r6v$y9T7L"],["-rgeoQueryResult.component.search","-o"],["-sgeoQueryResult.component.geometryPicker","9N9K9L9M9I4T4J"],["-uhotspot.shape.geometryStorage","4t"],["-vhotspot.shape.geometry.MultiPolygon","-A5O4r-u9_6L"],["-whotspot.shape.geometry.Rectangle","9K-u4K-x"],["-xhotspot.shape.geometry.Base","5O6L"],["-yhotspot.shape.geometry.Polyline","9S-u-x4K"],["-Ahotspot.shape.geometry.Polygon","-y-u-x9-4K"],["-Bhotspot.shape.geometry.Circle","4K4r4L-u-x"],["-Chotspot.layer.addon.hint","578.6f6B4n3O4U"],["-Dhotspot.layer.addon.balloon","8!576f4n3V4U"],["-Eyandex.enterprise.mapRestriction.vector","30"],["-Fyandex.enterprise.mapRestriction.route","-G-E-p-m9M9L3S3,9T3-3_4L"],["-Gyandex.enterprise.mapRestriction.imageMap","-E9M9U3_4r3,"],["-Hmap.control.manager.Layout","3X7s7t4c7p4s"],["-Mmap.action.Base","6L"],["-Stheme.browser.desktop.ie7","_55,_-7k"],["-Ttheme.browser.desktop.gecko","5,_3$C$B7k"],["-Utheme.browser.desktop.ie8","_55,_-7k"],["-Vtheme.browser.desktop.presto","_55,7k"],["-Wtheme.browser.desktop.safari","7k5,_3$C$B"],["-Xtheme.browser.desktop.ie9","5,7i_3$C$B"],["-Ytheme.browser.desktop.webkit","7i5,_3$C$B"],["-0theme.browser.touch.common","5,_3$C$B7k"],["-1theme.browser.touch.webkit","5,"],["-2theme.browser.pointer.ie10","5,_7$D$E_.7i"],["-3theme.twirl.control.meta","5M5,_Q"],["-4theme.twirl.clusterAccordion.layout.List","383X5T2c7s6c4T7t4n"],["-5theme.twirl.hint.meta","5M5,-6"],["-6theme.twirl.hint.preset","5M-,.K(P(p5p4c"],["-7theme.twirl.control.search.Layout","5T388u7o6!$4$37s7t4n4T4k6B383X2b1f1-061Q"],["-8theme.twirl.search.meta","5,5M-9"],["-9theme.twirl.search.preset","5M5,8u-7"],["-$theme.twirl.behavior.meta","5,"],["--theme.twirl.routeEditor.meta","5,5M-_"],["-_theme.twirl.routeEditor.preset","5M5,(-"],["-.theme.twirl.cluster.metaOptions","5,-!5M"],["-!theme.twirl.cluster.layout.preset","5M!t!u.,.u.)!E5s.(.).I.J.H.Q-4_j.6.7"],["-*theme.twirl.balloon.Layout","5T387t4T310u7o4k"],["-(theme.twirl.balloon.meta","5M5,-)"],["-)theme.twirl.balloon.preset","5M-*.y.q.z.j.A.x(z5p4c"],["-,theme.twirl.label.Layout","5T386L"],["-qtheme.twirl.label.meta","5M5,-j"],["-jtheme.twirl.label.preset","5M-,.K(P"],["-ztheme.twirl.geometryEditor.meta","5,.S.P.R4c3z"],["-Qgeometry.component.pixelGeometryGeodesic.storage","4t"],["-Jgeometry.component.pixelGeometryGeodesic.rectangle","-Z-Q9-9_"],["-Zgeometry.component.pixelGeometryGeodesic.lineString","-Q9U7O"],["_ageometry.component.pixelGeometryGeodesic.polygon","-Z-Q9-"],["_bgeometry.component.pixelGeometryGeodesic.circle","-Q9_9U4E"],["_cgeometry.component.pixelGeometrySimplification.storage","4t"],["_dgeometry.component.pixelGeometrySimplification.lineString","7a_c"],["_egeometry.component.pixelGeometrySimplification.polygon","9-_d_c"],["_fgeometry.component.commonMethods.rectangle","4r9S"],["_ggeometry.component.commonMethods.polygon","9T9S4r"],["_hgeometry.component.commonMethods.circle"],["_itraffic.provider.actual.metaOptions","5M5,_k"],["_ktraffic.provider.actual.preset","5M6p3,!e()((!f.Z"],["_ltraffic.provider.forecast.metaOptions","5M5,_m"],["_mtraffic.provider.forecast.preset","5M3,"],["_ntraffic.provider.archive.metaOptions","5M5,_o"],["_otraffic.provider.archive.preset","5M3,"],["_pgeometryEditor.controller.PointDrawing","4K.03X"],["_rgeometryEditor.controller.LineStringDrawing","4K.04v"],["_sgeometryEditor.controller.PolygonDrawing","4K.04v"],["_tgeometryEditor.controller.BasePath","4K_u$f$e8u"],["_ugeometryEditor.controller.Base","4s"],["_vgeometryEditor.controller.EdgeDragging","4K4v4l.2"],["_wgeometryEditor.controller.VertexDragging","4K4l.2"],["_xgeometryEditor.controller.PointDragging","4K.1$m"],["_ygeometryEditor.options.guideLinesMapping","_C"],["_AgeometryEditor.options.vertexMapping","_C"],["_BgeometryEditor.options.edgeMapping","_C"],["_CgeometryEditor.options.mapper","5P"],["_DgeometryEditor.Base","4s6L6c5O_C3X"],["_EgeometryEditor.model.RootVertex","4K_T_V31"],["_FgeometryEditor.model.RootPolygon","4K_T_O"],["_GgeometryEditor.model.RootLineString","4K_T_N"],["_HgeometryEditor.model.RootLinearRing","4K_G_P"],["_IgeometryEditor.model.ChildVertex","4K_R_V31"],["_KgeometryEditor.model.ChildLineString","4K_R_N"],["_LgeometryEditor.model.ChildPolygon","4K_R_O"],["_MgeometryEditor.model.ChildLinearRing","4K_K_P"],["_NgeometryEditor.model.component.LineString","4K_I.53X$n.4.331"],["_OgeometryEditor.model.component.Polygon","4K_M.5"],["_PgeometryEditor.model.component.LinearRing","4K_N"],["_RgeometryEditor.model.MultiPointChild","4K_S"],["_SgeometryEditor.model.BaseChild","4K_U"],["_TgeometryEditor.model.BaseRoot","4K_U"],["_UgeometryEditor.model.Base","$H"],["_VgeometryEditor.model.mixin.Vertex"],["_WgeometryEditor.view.BasePath","4K_Y5f_A_B"],["_XgeometryEditor.view.Base","4s"],["_YgeometryEditor.view.BaseParent","4K_X$n"],["_0domEvent.touch.overrideStorage","4t"],["_1domEvent.multiTouch.overrideStorage","4t"],["_2domEvent.managerComponent.mouseLeaveEnterDispatcher","4M6F6x"],["_3domEvent.managerOverrides.touches","4M_66w"],["_4domEvent.managerComponent.wheelDispatcher","4M6F"],["_5domEvent.managerOverrides.desktop","_4_2_6"],["_6domEvent.managerOverrideStorage","4t"],["_7domEvent.managerOverrides.pointers","4M_66E"],["_8domEvent.multiPointer.overrideStorage","4t"],["_9domEvent.pointer.overrideStorage","4t"],["_$domEvent.Base","4K31"],["_-domEvent.override.ie78","__"],["__domEvent.overrideStorage","4t"],["_.domEvent.override.common","__4w4P"],["_!router.editor.component.wayPoint.Editor","4n6L4*"],["_*router.editor.component.wayPoint.Remover","6L"],["_(router.editor.component.wayPoint.Adder","8e6L4e4*"],["_)router.editor.component.viaPoint.Editor","4n6L"],["_,router.editor.component.viaPoint.Remover","6L"],["_qrouter.editor.component.viaPoint.Adder","6L4Q9S4n"],["_jtheme.twirl.clusterAccordion.layout.ListItem","383X5T2!6B7s7t4s7o4n"],["_ztheme.twirl.control.preset.geolocation","5M39"],["_Qtheme.twirl.control.preset.core","5M5,8u_z(-"],["_Jtheme.twirl.control.layout.ListBox","7s7t7o$3$44k5T3X386!4U0e2z8u"],["_Ztheme.twirl.control.layout.Zoom","4K7s7t7o3X6B$34O5T3K38.b121b"],[".atheme.twirl.control.layout.Group","6*384K.$316!7N7s7t4n4U"],[".btheme.twirl.control.layout.SmallZoom","7s7t7o3X6B$35T386!1b"],[".ctheme.twirl.control.layout.Button","5T1h266f38$3$4387s7o316!7t4N3X"],[".dtheme.twirl.control.layout.ScaleLine","5T.!387s6!3H$y"],[".etheme.twirl.geoObject.layout.IconContent","385T"],[".ftheme.twirl.control.layout.Rollup","5T246!$37s6B6F4O38"],[".gtheme.twirl.geoObject.layout.BalloonFooterContent","4K386e.j"],[".htheme.twirl.geoObject.layout.HintContent","385T"],[".itheme.twirl.geoObject.layout.BalloonHeaderContent","385T"],[".ktheme.twirl.geoObject.layout.StretchyIcon","385T7s7t7o3X117N"],[".ltheme.twirl.geoObject.layout.BalloonBodyContent","385T"],[".mtheme.twirl.geoObject.preset.poiIcon","5M39"],[".ntheme.twirl.geoObject.preset.dotIcon","5M39"],[".otheme.twirl.geoObject.preset.stretchyIcon","5M.k"],[".ptheme.twirl.geoObject.preset.blankIcon","5M37"],[".rtheme.twirl.geoObject.meta.editor","5M5,"],[".stheme.twirl.geoObject.meta.full","5M5,.o.t.r"],[".ttheme.twirl.geoObject.meta.standard","5M5,5s$Q39.e.h.l.g.i.n.p.m"],[".utheme.twirl.cluster.layout.Icon","7s7t6B6L31384d(*5R4f"],[".vtheme.twirl.hotspot.meta.hint","5,5T"],[".wtheme.twirl.hotspot.meta.balloon","5,5T"],[".xtheme.twirl.balloon.layout.CloseButton","6B315T382J"],[".ytheme.twirl.balloon.layout.Content","385T02"],[".Atheme.twirl.balloon.layout.Shadow","385T7s7o7t5R3l"],[".Htheme.twirl.clusterCarousel.layout.Pager","385T0m3X6c4T7s4U7t"],[".Itheme.twirl.clusterCarousel.layout.Content","385,5T0.3X6c6B4T7s7t7o"],[".Ktheme.twirl.label.layout.Content","385T"],[".Ntheme.twirl.control.layout.Traffic","5T38!d6f7t7o5M5O6c4n9q"],[".Otheme.twirl.traffic.metaOptions.control","5,.N"],[".Ptheme.twirl.geometryEditor.layout.Edge","4s7s7t6B6L31384d"],[".Rtheme.twirl.geometryEditor.layout.Menu","7s7t6B6L38"],[".Stheme.twirl.geometryEditor.layout.Vertex","7s7t4K6*3X6B3138"],[".Tgeometry.component.renderFlow.stageGeodesic","-Q"],[".Ugeometry.component.renderFlow.stageShift","9X"],[".Vgeometry.component.renderFlow.stageScale"],[".Wgeometry.component.renderFlow.stageSimplification","_c"],[".XgeometryEditor.drawing.syncObject","6L"],[".YgeometryEditor.drawing.Tool","4n3X4e$m"],[".0geometryEditor.controller.PathDrawing","4K_u4n3X.X.Y"],[".1geometryEditor.controller.BaseMarkerDragging","4K_u5O"],[".2geometryEditor.controller.BasePathMarkerDragging","4K.1$m5O"],[".3geometryEditor.model.EdgeGeometry","4s$H315O97$y"],[".4geometryEditor.model.Edge","4K_T31"],[".5geometryEditor.model.component.BaseParent","4s$n31"],[".6theme.twirl.clusterAccordion.layout.ItemTitle","383X5T0X7s7t5O395M"],[".7theme.twirl.clusterAccordion.layout.ItemContent","383X5T2t7s7t"],[".8theme.twirl.control.layout.ListBoxItem","5T1x0x6!3X$37s7t38"],[".9theme.twirl.control.layout.ListBoxSeparator","5T6!1n387t"],[".-theme.twirl.control.miniMap.Layout","6*4K387t(.5v3Q3X3P7N..7s7t7o3Z6!31"],["._control.miniMap.DragComponent","4O9C"],["..control.miniMap.LayerPane","6B6L313X7s7t7P7G._"],[".*theme.twirl.control.layout.ToolBarSeparator","5T38"],[".(theme.twirl.cluster.layout.NightIconContent","385T(!"],[".)theme.twirl.cluster.layout.IconContent","385T"],[".,theme.twirl.cluster.balloon.layout.ContentBody","385T0C3X7s"],[".qtheme.twirl.balloon.layout.content.Header","5T38"],[".jtheme.twirl.balloon.layout.content.Footer","385T"],[".ztheme.twirl.balloon.layout.content.Body","385T"],[".Qtheme.twirl.clusterCarousel.layout.PagerItem","385T193X7s7o"],[".Jtheme.twirl.clusterCarousel.layout.ContentItem","385T3r3X7s"],[".Ztheme.twirl.traffic.layout.trafficLight.balloon.ContentBody","385T7s7o8u()((6B6l"],["!btheme.twirl.traffic.layout.control.constants"],["!ctheme.twirl.traffic.layout.control.ContentLayout","5T!b6l3y7t386!7s"],["!dtheme.twirl.control.layout.TurnedOff","5T6!6B7s0a3y7o7t$3$4"],["!etraffic.balloon.layout.ContentBody","385T7s7o!x()((6B8u3H31"],["!ftraffic.balloon.layout.InfoContentBody","385T7s(,8u6B4H6l"],["!gtheme.twirl.traffic.metaOptions.trafficJamLayer.hint","5M5,"],["!htheme.twirl.traffic.preset.control.actual","5M!v!w!L!K!V!W!Y!F!G"],["!itheme.twirl.traffic.metaOptions.trafficLight.balloon","5M5,.Z"],["!ktheme.twirl.traffic.preset.control.forecast","5M!v!w!L!K!H!N!8!1!2!Y!X!-!."],["!ltheme.twirl.traffic.preset.control.archive","5M!v!w!L!K!M!N!$!1!2!Y!0!-!."],["!mtheme.twirl.traffic.preset.trafficLight.icon","5M6l"],["!ntheme.twirl.traffic.preset.trafficLight.balloon","5M.Z"],["!otheme.twirl.control.miniMap.switcher.Layout","6*4K6B7o7t8u38"],["!ttheme.twirl.cluster.balloon.layout.Sidebar","385T7s6c7t4n4U3X4T2R"],["!utheme.twirl.cluster.balloon.layout.MainContent","385T7s3X1w"],["!vtheme.twirl.traffic.layout.control.Header","7s7t7o$3$46f5T6B!b0a"],["!wtheme.twirl.traffic.layout.control.Body","7s7t7o6f5T6B!b2T"],["!xtraffic.balloon.layout.Distance","388u7s3H"],["!ytheme.twirl.traffic.layout.trafficJamLayer.hint.Content","385T7s8u3H"],["!Atheme.twirl.traffic.preset.control.actualServicesList","5M!7"],["!Etheme.twirl.cluster.balloon.layout.SidebarItem","385T2_3X7s7o"],["!Ftheme.twirl.traffic.layout.control.actual.TimeHint","5T7s7t8u6f"],["!Gtheme.twirl.traffic.layout.control.actual.OpenedPanelContent","7o5T"],["!Htheme.twirl.traffic.layout.control.forecast.EmptyTimeHint","6L7t"],["!Itheme.twirl.traffic.layout.control.forecast.TimeHint","5T7s7t8u6f"],["!Ktheme.twirl.traffic.layout.control.Points","7s7t6f3H8u5T2k7t"],["!Ltheme.twirl.traffic.layout.control.ChooseCity","5T0*"],["!Mtheme.twirl.traffic.layout.control.archive.TimeHint","5T7s7t8u6f"],["!Ntheme.twirl.traffic.layout.control.archive.OpenedPanelContent","5T"],["!Vtheme.twirl.traffic.layout.control.ActualServicesList","5T7s387s5M"],["!Wtheme.twirl.traffic.layout.control.actual.StateHint","5T7s7t8u6f0F"],["!Xtheme.twirl.traffic.layout.control.forecast.StateHint","5T7s7t8u6f0F"],["!Ytheme.twirl.traffic.layout.control.Switcher","5T7s7o7t6B4O153K8u"],["!0theme.twirl.traffic.layout.control.archive.StateHint","5T7s7t8u6f0F"],["!1theme.twirl.traffic.layout.control.archive.PanelFoot","5T0t7s8u"],["!2theme.twirl.traffic.layout.control.archive.TimeControl","5T7s7t7o6d6f!9!b5O"],["!7theme.twirl.traffic.layout.control.trafficEvents","5T6B7s7o6f381N"],["!8theme.twirl.traffic.layout.control.forecast.TimeLine","5T7s7t3X6B4O7O1.!b"],["!9theme.twirl.traffic.layout.control.archive.WeekDays","5T2D7s7o6B4s8u!_3X"],["!$theme.twirl.traffic.layout.control.archive.TimeLine","5T7s7t6f6B4O7P7O0v!b"],["!-theme.twirl.traffic.layout.control.archive.weekDays.OnTheNearestTime","5T7s7o3X8u6B"],["!_theme.twirl.traffic.layout.control.archive.WeekDay","5T7s7o3X6k6B"],["!.theme.twirl.traffic.layout.control.archive.weekDays.SelectButton","5T7s7o6B2i8u3X"]],css:[["0bb-form-button_height_26"],["0ci-popup__under_color_white.ie"],["0fb-form-button__input.ie"],["0gb-form-radio__button.standards"],["0hb-form-input.standards"],["0ib-select_control_search.ie8"],["0kb-form-button_theme_grey-sm.ie"],["0lb-select__hint.standards"],["0ni-popup_visibility_visible"],["0ob-form-button_height_19"],["0pb-popupa_scale-slider_yes"],["0rb-traffic-balloon__line"],["0sb-cluster-accordion.standards"],["0wb-form-checkbox_disabled_yes.standards"],["0yb-form-button_valign_middle"],["0Ab-traffic-panel__msg"],["0Bb-form-button_focused_yes"],["0Db-traffic-balloon_type_info"],["0Eb-ruler.ie"],["0Gb-form-switch_theme_switch-s.standards"],["0Hb-select_type_prognos.standards"],["0Ib-form-radio__button_disabled_yes.standards"],["0Ki-popup__under_type_paranja.ie"],["0Lb-form-input_size_16.ie"],["0Mb-cluster-accordion_list_marker"],["0Nb-form-button_type_simple"],["0Ob-cluster-tabs"],["0Pb-traffic-panel__level-hint"],["0Rb-api-link"],["0Sb-cluster-carousel_pager_numeric.standards"],["0Ub-popupa.ie"],["0Vb-form-button.standards"],["0Wb-select.standards"],["0Yb-form-radio__button_side_both.standards"],["00b-zoom__scale.ie"],["01b-pseudo-link.standards"],["03b-zoom__sprite.standards"],["04b-select__arrow.ie"],["05b-search__button"],["07b-dropdown-button.ie"],["08i-popup"],["09b-cluster-carousel_pager_marker.ie"],["0$b-traffic-panel.standards"],["0-b-form-switch_disabled_yes.ie"],["0_b-cluster-carousel.standards"],["0!b-form-checkbox_disabled_yes.ie"],["0)b-form-button.ie"],["0,b-popupa__shadow.standards"],["0qb-tip.ie"],["0jb-traffic-panel__scale.ie8"],["0Qb-form-button_theme_simple-grey.ie"],["0Jb-traffic-week.ie8"],["0Zb-select_search.standards"],["1ab-serp-url"],["1cb-form-input__clear_visibility_visible"],["1di-popup__under.standards"],["1eb-popupa__tail.ie"],["1gb-form-button_theme_grey-sm.standards"],["1ib-traffic-balloon_type_tip"],["1kb-select_control_traffic.ie"],["1lb-form-button_disabled_yes"],["1ob-cluster-carousel.ie"],["1pb-zoom.ie"],["1rb-zoom.standards"],["1sb-form-button_theme_grey-no-transparent-26.standards"],["1tb-cluster-carousel_pager_numeric.ie"],["1ui-custom-scroll"],["1vb-placemark"],["1yb-form-switch.ie"],["1Ab-form-input.ie"],["1Bb-search.ie"],["1Cb-cluster-accordion_list_numeric"],["1Db-traffic-panel__scale.standards"],["1Eb-select.ie"],["1Fb-traffic-panel.ie"],["1Gb-popupa.standards"],["1Hb-form-button_pressed_yes"],["1Ib-dropdown-button.standards"],["1Kb-form-button_theme_grey-19.standards"],["1Lb-form-button_theme_simple-grey.standards"],["1Mi-popup__under.ie"],["1Ob-balloon.standards"],["1Rb-ico.ie"],["1Tb-select__panel-switcher.standards"],["1Ub-cluster-content"],["1Vb-form-radio__button_side_both.ie"],["1Wb-select_type_prognos.ie"],["1Xb-select__pager.ie"],["1Yb-form-checkbox_focused_yes.ie"],["10b-form-radio.ie8"],["13b-listbox-panel.standards"],["14b-popupa_theme_ffffff.ie"],["16b-form-checkbox_focused_yes.standards"],["17b-form-switch.standards"],["18b-traffic-panel__layer.ie8"],["1$b-form-checkbox_checked_yes.standards"],["1_b-placemark_theme"],["1!b-select_search.ie"],["1*b-form-input__hint.ie"],["1(b-zoom__scale.standards"],["1,b-form-button_hovered_yes"],["1qb-form-button_theme_grey-19.ie"],["1jb-form-input_has-clear_yes"],["1zb-form-button__click.standards"],["1Jb-balloon.ie"],["1Zb-form-input__hint.standards"],["2ai-popup__under_type_paranja.standards"],["2eb-select_control_traffic.standards"],["2fb-zoom__hint.ie"],["2gb-form-radio__button_checked_yes.ie"],["2hb-form-button__click.ie"],["2lb-search__input.ie"],["2mb-form-radio__button.ie"],["2nb-listbox-panel.ie8"],["2pb-form-checkbox.standards"],["2rb-zoom__hint.standards"],["2sb-search.standards"],["2ub-traffic-panel__layer.standards"],["2vb-pseudo-link.ie"],["2wb-cluster-carousel_pager_marker.standards"],["2xb-ruler.standards"],["2yb-form-button_height_22"],["2Ab-form-button_theme_grey-no-transparent-26.ie"],["2Bb-poi-balloon-content.standards"],["2Cb-tip.standards"],["2Eb-form-button_theme_grey-22.ie"],["2Fb-form-radio_size_11.standards"],["2Gb-listbox-panel.ie"],["2Hb-select_control_search.ie"],["2Ib-form-input_size_16.standards"],["2Kb-form-button_theme_grey-22.standards"],["2Lb-form-input__clear.ie"],["2Nb-select_control_listbox.standards"],["2Ob-form-input__clear.standards"],["2Pb-ico.standards"],["2Sb-search-panel.standards"],["2Ub-select_data_no-data"],["2Vb-cluster-accordion.ie"],["2Wb-form-radio__button_focused_yes"],["2Xb-form-radio.ie"],["2Yb-search-panel.ie"],["20b-zoom__sprite.ie"],["21b-form-checkbox_size_13.ie"],["22b-traffic-week.standards"],["23b-serp-item"],["25b-select__arrow.standards"],["27b-form-radio__button_disabled_yes.ie"],["28b-select__hint.ie"],["29b-traffic-panel__scale.ie"],["2$b-form-radio__button.ie8"],["2-b-form-radio__button_checked_yes.ie8"],["2.b-popupa_theme_ffffff.standards"],["2*b-traffic-panel__layer.ie"],["2(b-form-checkbox.ie8"],["2,b-select_control_listbox.ie"],["2qb-form-switch_pressed_yes"],["2jb-zoom__mark"],["2Qb-select__panel-switcher.ie"],["2Zb-traffic-balloon"],["3ab-search__input.standards"],["3bb-form-switch_theme_switch-s.ie8"],["3db-form-checkbox_size_13.standards"],["3eb-form-button_size_sm"],["3fb-form-input__hint_visibility_visible"],["3gb-form-button__input.standards"],["3hb-form-switch_type_switch.ie"],["3ib-form-radio__button_checked_yes.standards"],["3kb-form-checkbox.ie"],["3mb-form-switch_theme_switch-s.ie"],["3nb-form-switch_focused_yes"],["3ob-poi-balloon-content.ie"],["3pb-popupa__tail.standards"],["3sb-form-checkbox_checked_yes.ie"],["3ti-popup__under_color_white.standards"],["3ub-form-radio_size_11.ie"],["3vb-traffic-panel__level"],["3wb-form-radio.standards"],["3xb-popupa__shadow.ie8"],["3Ab-form-switch_disabled_yes.standards"],["3Bb-form-switch_type_switch.standards"],["3Cb-select_control_search.standards"],["3Eb-popupa__shadow.ie"],["3Fb-select__pager.standards"],["5Scss.common"],["5jmap.css"],["8Tbehavior.ruler.css"],["8Vcss.overlay.label"],["8Wcss.overlay.commonIe"],["8Xcss.overlay.common"],["8Ycss.control.layer"],["$Ylayer.tile.domTile.css"],["$0util.nodeSize.css.common"],["-tpane.GlassPane.css-ie"],["-Imap.copyrights.css.ie"],["-Kmap.copyrights.css.standards"],["-Lmap.copyrights.css.common"],["-Nmap.css.en.ie"],["-Omap.css.ru.ie"],["-Pmap.css.ru.standards"],["-Rmap.css.en.standards"],[".Btheme.twirl.balloon.css.ie7",".E"],[".Ctheme.twirl.balloon.css.ie6",".E"],[".Dtheme.twirl.balloon.css.ie8",".E"],[".Etheme.twirl.balloon.css.ie"],[".Ftheme.twirl.balloon.css.ie9",".G"],[".Gtheme.twirl.balloon.css.standards"],[".Ltheme.twirl.label.css.ie"],[".Mtheme.twirl.label.css.common"],[".$groupControl.css"],[".!control.scaleline.css"],["!afake.css"],["!pcontrol.minimap.css.ie8"],["!rcontrol.minimap.css.ie"],["!scontrol.minimap.css.common"],["!Btheme.twirl.clusterNightContent.common.css"],["!Ctheme.twirl.cluster.default.ie.css"],["!Dtheme.twirl.cluster.default.common.css"],["!Otraffic.balloon.tip.css.ie"],["!Ptraffic.balloon.tip.css.common"],["!Rtraffic.balloon.layout.css.ie"],["!Straffic.balloon.layout.css.common"],["!Ttraffic.balloon.infoLayout.css.ie"],["!Utraffic.balloon.infoLayout.css.common"],["!3traffic.balloon.tip.yellow.css"],["!4traffic.balloon.tip.green.css"],["!5traffic.balloon.tip.red.css"],["!6traffic.balloon.tip.brown.css"]]},o,u,h,p;(function(){var t="",n="",r;h=function(e,n,r){n.execute?r():m(e,u.getDepends(n),function(){t+=n.source(o),n.execute=!0,r()})},p=function(){if(!t)return;r||(r=e.createElement("style"),r.type="text/css"),r.styleSheet?(n+=t,r.styleSheet.cssText=n,r.parentNode||e.getElementsByTagName("head")[0].appendChild(r)):(r.appendChild(e.createTextNode(t)),e.getElementsByTagName("head")[0].appendChild(r),r=null),t=""}})();var w=function(e,t){e.prototype=E(t.prototype),e.prototype.constructor=e,e.superclass=t.prototype,e.superclass.constructor=t},E=Object.create||function(e){function t(){}return t.prototype=e,new t},S=Object.keys?function(e,t){var n=Object.keys(t);for(var r=0,i=n.length;r<i;r++)e[n[r]]=t[n[r]];return e}:function(e,t){for(var n in t)t.hasOwnProperty(n)&&(e[n]=t[n]);return e};return C}(document,window)
init('ymaps','https://api-maps.yandex.ru/2.0.42/release/',false,{"name":"Chrome","version":"47.0.2526","engine":"WebKit","engineVersion":"537.36","osFamily":"Windows","osVersion":"6.3","isMobile":false,"cssPrefix":"Webkit","transitionEndEventName":"webkitTransitionEnd"},'package.standard',project_data,'ymaps2_0_42','')
})();

    
/* ========================================================================
 * Bootstrap (plugin): validator.js v0.9.0
 * ========================================================================
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Cina Saffary.
 * Made by @1000hz in the style of Bootstrap 3 era @fat
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * ======================================================================== */


+function ($) {
  'use strict';

  // VALIDATOR CLASS DEFINITION
  // ==========================

  var Validator = function (element, options) {
    this.$element = $(element)
    this.options  = options

    options.errors = $.extend({}, Validator.DEFAULTS.errors, options.errors)

    for (var custom in options.custom) {
      if (!options.errors[custom]) throw new Error('Missing default error message for custom validator: ' + custom)
    }

    $.extend(Validator.VALIDATORS, options.custom)

    this.$element.attr('novalidate', true) // disable automatic native validation
    this.toggleSubmit()

    this.$element.on('input.bs.validator change.bs.validator focusout.bs.validator', $.proxy(this.validateInput, this))
    this.$element.on('submit.bs.validator', $.proxy(this.onSubmit, this))

    this.$element.find('[data-match]').each(function () {
      var $this  = $(this)
      var target = $this.data('match')

      $(target).on('input.bs.validator', function (e) {
        $this.val() && $this.trigger('input.bs.validator')
      })
    })
  }

  Validator.INPUT_SELECTOR = ':input:not([type="submit"], button):enabled:visible'

  Validator.DEFAULTS = {
    delay: 500,
    html: false,
    disable: true,
    custom: {},
    errors: {
      match: 'Does not match',
      minlength: 'Not long enough'
    },
    feedback: {
      success: 'glyphicon-ok',
      error: 'glyphicon-remove'
    }
  }

  Validator.VALIDATORS = {
    'native': function ($el) {
      var el = $el[0]
      return el.checkValidity ? el.checkValidity() : true
    },
    'match': function ($el) {
      var target = $el.data('match')
      return !$el.val() || $el.val() === $(target).val()
    },
    'minlength': function ($el) {
      var minlength = $el.data('minlength')
      return !$el.val() || $el.val().length >= minlength
    }
  }

  Validator.prototype.validateInput = function (e) {
    var $el        = $(e.target)
    var prevErrors = $el.data('bs.validator.errors')
    var errors

    if ($el.is('[type="radio"]')) $el = this.$element.find('input[name="' + $el.attr('name') + '"]')

    this.$element.trigger(e = $.Event('validate.bs.validator', {relatedTarget: $el[0]}))

    if (e.isDefaultPrevented()) return

    var self = this

    this.runValidators($el).done(function (errors) {
      $el.data('bs.validator.errors', errors)

      errors.length ? self.showErrors($el) : self.clearErrors($el)

      if (!prevErrors || errors.toString() !== prevErrors.toString()) {
        e = errors.length
          ? $.Event('invalid.bs.validator', {relatedTarget: $el[0], detail: errors})
          : $.Event('valid.bs.validator', {relatedTarget: $el[0], detail: prevErrors})

        self.$element.trigger(e)
      }

      self.toggleSubmit()

      self.$element.trigger($.Event('validated.bs.validator', {relatedTarget: $el[0]}))
    })
  }


  Validator.prototype.runValidators = function ($el) {
    var errors   = []
    var deferred = $.Deferred()
    var options  = this.options

    $el.data('bs.validator.deferred') && $el.data('bs.validator.deferred').reject()
    $el.data('bs.validator.deferred', deferred)

    function getErrorMessage(key) {
      return $el.data(key + '-error')
        || $el.data('error')
        || key == 'native' && $el[0].validationMessage
        || options.errors[key]
    }

    $.each(Validator.VALIDATORS, $.proxy(function (key, validator) {
      if (($el.data(key) || key == 'native') && !validator.call(this, $el)) {
        var error = getErrorMessage(key)
        !~errors.indexOf(error) && errors.push(error)
      }
    }, this))

    if (!errors.length && $el.val() && $el.data('remote')) {
      this.defer($el, function () {
        var data = {}
        data[$el.attr('name')] = $el.val()
        $.get($el.data('remote'), data)
          .fail(function (jqXHR, textStatus, error) { errors.push(getErrorMessage('remote') || error) })
          .always(function () { deferred.resolve(errors)})
      })
    } else deferred.resolve(errors)

    return deferred.promise()
  }

  Validator.prototype.validate = function () {
    var delay = this.options.delay

    this.options.delay = 0
    this.$element.find(Validator.INPUT_SELECTOR).trigger('input.bs.validator')
    this.options.delay = delay

    return this
  }

  Validator.prototype.showErrors = function ($el) {
    var method = this.options.html ? 'html' : 'text'

    this.defer($el, function () {
      var $group = $el.closest('.form-group')
      var $block = $group.find('.help-block.with-errors')
      var $feedback = $group.find('.form-control-feedback')
      var errors = $el.data('bs.validator.errors')

      if (!errors.length) return

      errors = $('<ul/>')
        .addClass('list-unstyled')
        .append($.map(errors, function (error) { return $('<li/>')[method](error) }))

      $block.data('bs.validator.originalContent') === undefined && $block.data('bs.validator.originalContent', $block.html())
      $block.empty().append(errors)
      $group.addClass('has-error')

      $feedback.length
        && $feedback.removeClass(this.options.feedback.success)
        && $feedback.addClass(this.options.feedback.error)
        && $group.removeClass('has-success')
    })
  }

  Validator.prototype.clearErrors = function ($el) {
    var $group = $el.closest('.form-group')
    var $block = $group.find('.help-block.with-errors')
    var $feedback = $group.find('.form-control-feedback')

    $block.html($block.data('bs.validator.originalContent'))
    $group.removeClass('has-error')

    $feedback.length
      && $feedback.removeClass(this.options.feedback.error)
      && $feedback.addClass(this.options.feedback.success)
      && $group.addClass('has-success')
  }

  Validator.prototype.hasErrors = function () {
    function fieldErrors() {
      return !!($(this).data('bs.validator.errors') || []).length
    }

    return !!this.$element.find(Validator.INPUT_SELECTOR).filter(fieldErrors).length
  }

  Validator.prototype.isIncomplete = function () {
    function fieldIncomplete() {
      return this.type === 'checkbox' ? !this.checked                                   :
             this.type === 'radio'    ? !$('[name="' + this.name + '"]:checked').length :
                                        $.trim(this.value) === ''
    }

    return !!this.$element.find(Validator.INPUT_SELECTOR).filter('[required]').filter(fieldIncomplete).length
  }

  Validator.prototype.onSubmit = function (e) {
    this.validate()
    if (this.isIncomplete() || this.hasErrors()) e.preventDefault()
  }

  Validator.prototype.toggleSubmit = function () {
    if(!this.options.disable) return

    var $btn = $('button[type="submit"], input[type="submit"]')
      .filter('[form="' + this.$element.attr('id') + '"]')
      .add(this.$element.find('input[type="submit"], button[type="submit"]'))

    $btn.toggleClass('disabled', this.isIncomplete() || this.hasErrors())
  }

  Validator.prototype.defer = function ($el, callback) {
    callback = $.proxy(callback, this)
    if (!this.options.delay) return callback()
    window.clearTimeout($el.data('bs.validator.timeout'))
    $el.data('bs.validator.timeout', window.setTimeout(callback, this.options.delay))
  }

  Validator.prototype.destroy = function () {
    this.$element
      .removeAttr('novalidate')
      .removeData('bs.validator')
      .off('.bs.validator')

    this.$element.find(Validator.INPUT_SELECTOR)
      .off('.bs.validator')
      .removeData(['bs.validator.errors', 'bs.validator.deferred'])
      .each(function () {
        var $this = $(this)
        var timeout = $this.data('bs.validator.timeout')
        window.clearTimeout(timeout) && $this.removeData('bs.validator.timeout')
      })

    this.$element.find('.help-block.with-errors').each(function () {
      var $this = $(this)
      var originalContent = $this.data('bs.validator.originalContent')

      $this
        .removeData('bs.validator.originalContent')
        .html(originalContent)
    })

    this.$element.find('input[type="submit"], button[type="submit"]').removeClass('disabled')

    this.$element.find('.has-error').removeClass('has-error')

    return this
  }

  // VALIDATOR PLUGIN DEFINITION
  // ===========================


  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var options = $.extend({}, Validator.DEFAULTS, $this.data(), typeof option == 'object' && option)
      var data    = $this.data('bs.validator')

      if (!data && option == 'destroy') return
      if (!data) $this.data('bs.validator', (data = new Validator(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.validator

  $.fn.validator             = Plugin
  $.fn.validator.Constructor = Validator


  // VALIDATOR NO CONFLICT
  // =====================

  $.fn.validator.noConflict = function () {
    $.fn.validator = old
    return this
  }


  // VALIDATOR DATA-API
  // ==================

  $(window).on('load', function () {
    $('form[data-toggle="validator"]').each(function () {
      var $form = $(this)
      Plugin.call($form, $form.data())
    })
  })

}(jQuery);

﻿$(document).ready(function(){
    $("#ychet-reviews .owl-carousel").owlCarousel({
        loop: true,
        items: 1,
        smartSpeed: 1000
    });

    var owl = $("#ychet-reviews .owl-carousel").data('owlCarousel');
    $('.right').bind('click', function(){
        owl.next();
    });

    $('.left').bind('click', function(){
        owl.prev();
    });
});

﻿﻿$(document).ready(function(){
    var myMap, placeMark;
    if ($('#yandexMap').length) {
        ymaps.ready(function () {
            $("#map-yandex").removeClass('hidden');
            myMap = new ymaps.Map("yandexMap", {
                center: [52.422304, 31.003549],
                zoom: 17
            });
            myMap.controls.add('zoomControl');

            placeMark = new ymaps.Placemark([52.422225, 31.00395], {
                hintContent: 'ООО «УчетАнализАудит»',
                balloonContent: 'Бухгалтерские и консалтинговые услуги в Гомеле. <br> <strong>г. Гомель, ул. Гагарина, 49, бизнес-центр «Авангард», пристройка, 2-й этаж, каб. 32-9.</sctrong>'
            }, {
                preset: "twirl#redIcon"
            });

            myMap.geoObjects.add(placeMark);
        });
    }
});
﻿$(document).ready(function(){
    $('#prefooter-simple form').validator().on('submit', function (e) {
        if (e.isDefaultPrevented()) {
        } else {
            e.preventDefault();
            submitForm();
        }

    });

    function submitForm(){
        var name = $('#prefooter-simple [name=name]').val();
        var email = $('#prefooter-simple [name=email]').val();
        var message = $('#prefooter-simple [name=message]').val();

        $.ajax({
            type: "POST",
            url: "http://" + window.location.host + "/home/sendMail",
            data: "name=" + name + "&email=" + email + "&message=" + message,
            success : function(text){
                if (text == "success"){
                    formSuccess();
                }
            }
        });
    }

    function formSuccess() {
        $("#prefooter-simple form").addClass('hidden');
        $("#prefooter-simple .success").removeClass("hidden").addClass('animated fadeIn');
    }
});

