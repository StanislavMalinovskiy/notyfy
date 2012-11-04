/**
 * noty - jQuery Notification Plugin v2.0.3
 * Contributors: https://github.com/needim/noty/graphs/contributors
 *
 * Examples and Documentation - http://needim.github.com/noty/
 *
 * Licensed under the MIT licenses:
 * http://www.opensource.org/licenses/mit-license.php
 *
 **/

(function($) {

	function NotyObject(options) {
		var self = this;

		$.extend(self, {
			container: $('#noty_container_'+options.layout),

			closed: false,
			shown: false,

			_generateID: function() {
				var id; do{
					id = 'noty_' + (new Date().getTime() * Math.floor(Math.random() * 1000000)); 
				}
				while(document.getElementById(id));
				return id;
			},

			init: function() {
				var adjuster;

				// Mix in the passed in options with the default options
				self.options = $.extend({}, $.noty.defaults, { id: self._generateID() }, options);

				// Generate noty container if needed
				if(!self.container.length) {
					self.container = $('<ul />', {
						'id': 'noty_container_'+self.options.layout,
						'class': 'noty_container i-am-new'
					})
					.appendTo(self.options.custom || document.body);

					// Apply any layout adjuters on window resize
					if((adjuster = $.noty.layouts[self.options.layout])) {
						$(window).bind('resize.'+self.options.id, function(event) {
							adjuster.call(self.container);
						})
						.triggerHandler('resize.'+self.options.id);
					}
				}

				// Not needed? Remove new class
				else { self.container.removeClass('i-am-new'); }

				// Build the noty dom initial structure
				self._build();

				return self;
			}, 

		 	_build: function() {
				// Generate noty bar
				var bar = $('<div />', {
					'id': self.options.id,
					'class': "noty_bar",
				})
				.append(self.options.template)
				.find('.noty_text')
				.html(self.options.text).end();

				// Generate noty container
				self.wrapper = $('<li />', {
					'class': ['noty_wrapper', 'noty_'+self.options.type].join(' '),
				}).hide().append(bar);

				// Apply theme class
				if(self.options.theme) { self.wrapper.addClass('notytheme_'+self.options.theme); }

				// Set buttons if available
				if (self.options.buttons) {
					self.options.closeWith = [];
					self.options.timeout = false;

					self.buttons = $('<div/>', {
						'class': 'noty_buttons'
					})
					.appendTo( $('.noty_bar', self.wrapper) )
					.append(
						$.map(self.options.buttons, function (i, button) {
							return $('<button/>', {
								'class': button.addClass || 'gray',
								'html': button.text,
								'click': function() {
									if ($.isFunction(button.onClick)) {
										button.onClick.call( $(this), self );
									}
								}
							})
						})
					);
				}

				// For easy access
				self.message = self.wrapper.find('.noty_message');
				self.closeButton = self.wrapper.find('.noty_close');

				// store noty for api
				$.noty.store[self.options.id] = self;
			},

			show: function() {
				// Append the container
				self.wrapper.appendTo(self.container);

				if($.inArray('click', self.options.closeWith) > -1) {
					self.wrapper.css('cursor', 'pointer').one('click', self.close);
				}
				if($.inArray('hover', self.options.closeWith) > -1) {
					self.wrapper.one('mouseenter', self.close);
				}
				if($.inArray('button', self.options.closeWith) > -1) {
					self.closeButton.one('click', self.close);
				}
				if($.inArray('button', self.options.closeWith) == -1) {
					self.closeButton.remove();
				}

				if(self.options.callback.onShow) {
					self.options.callback.onShow.apply(self);
				}

				function after() {
					if (self.options.callback.afterShow) self.options.callback.afterShow.apply(self);
					self.shown = true;
				}

				if ($.isFunction(self.options.showEffect)) {
					self.wrapper.clearQueue().stop();
					self.options.showEffect.call(self, self.wrapper);
					self.wrapper.queue(after);
				}
				else { self.wrapper.show(); after(); }

				// If noty is have a timeout option
				if (self.options.timeout)
					self.wrapper.delay(self.options.timeout).promise().done(function () {
						self.close();
					});

				return self;

			}, // end show

			close:function () {
				if (self.closed) return;

				if (!self.shown) { // If we are still waiting in the queue just delete from queue
					var queue = [];
					$.each($.noty.queue, function (i, n) {
						if (n.options.id != self.options.id) {
							queue.push(n);
						}
					});
					$.noty.queue = queue;
					return;
				}

				self.wrapper.addClass('i-am-closing-now');

				if (self.options.callback.onClose) {
					self.options.callback.onClose.apply(self);
				}

				function after() {
					if (self.options.callback.afterClose) self.options.callback.afterClose.apply(self);

					// Modal Cleaning
					if (self.options.modal) {
						$.notyRenderer.setModalCount(-1);
						if ($.notyRenderer.getModalCount() == 0) $('.noty_modal').fadeOut('fast', function () {
							$(self).remove();
						});
					}

					// Layout Cleaning
					$.notyRenderer.setLayoutCountFor(self, -1);
					if ($.notyRenderer.getLayoutCountFor(self) == 0) self.wrapper.remove();

					// Make sure self.wrapper has not been removed before attempting to remove it
					if (typeof self.wrapper !== 'undefined' && self.wrapper !== null ) {
						self.wrapper.remove();
						self.wrapper = null;
						self.closed = true;
					}

					delete $.noty.store[self.options.id]; // deleting noty from store

					if (!self.options.dismissQueue) {
						// Queue render
						$.noty.ontap = true;

						$.notyRenderer.render();
					}
				}

				if ($.isFunction(self.options.hideEffect)) {
					self.wrapper.clearQueue().stop();
					self.options.hideEffect.call(self, self.wrapper);
					self.wrapper.queue(after);
				}
				else { self.wrapper.hide(); after(); }

			},

			setText: function(text) {
				if (!self.closed) {
					self.options.text = text;
					self.wrapper.find('.noty_text').html(text);
				}
				return self;
			},

			setType: function(type) {
				if (!self.closed) {
					self.options.type = type;
				}
				return self;
			}
		});

		self.init();
	};

	$.notyRenderer = {
		init: function(options) {

			// Renderer creates a new noty
			var noty = new NotyObject(options);

			$.noty.queue[noty.options.force ? 'unshift' : 'push'](noty);

			$.notyRenderer.render();

			return ($.noty.returns == 'object') ? noty : noty.options.id;
		},

		render: function() {
			var instance = $.noty.queue[0];

			if ($.type(instance) === 'object') {
				if (instance.options.dismissQueue) {
					$.notyRenderer.show($.noty.queue.shift());
				} else {
					if ($.noty.ontap) {
						$.notyRenderer.show($.noty.queue.shift());
						$.noty.ontap = false;
					}
				}
			} else {
				$.noty.ontap = true; // Queue is over
			}

		},

		show: function(noty) {
			if(noty.options.modal) {
				$.notyRenderer.createModalFor(noty);
				$.notyRenderer.setModalCount(+1);
			}

			$.notyRenderer.setLayoutCountFor(noty, +1);

			noty.show();
		},

		createModalFor: function(noty) {
			if ($('.noty_modal').length == 0) {
				var modal = $('<div/>').addClass('noty_modal').data('noty_modal_count', 0).prependTo($('body')).fadeIn('fast');
				if(noty.options.theme) { modal.addClass('notytheme_'+noty.options.theme); }
			}
		},

		getLayoutCountFor: function(noty) {
			return noty.container.data('noty_layout_count') || 0;
		},

		setLayoutCountFor: function(noty, arg) {
			return noty.container.data('noty_layout_count', $.notyRenderer.getLayoutCountFor(noty) + arg);
		},

		getModalCount: function() {
			return $('.noty_modal').data('noty_modal_count') || 0;
		},

		setModalCount: function(arg) {
			return $('.noty_modal').data('noty_modal_count', $.notyRenderer.getModalCount() + arg);
		}
	};

	$.noty = {
		queue: [],
		store: {},
		layouts: {
			center: function() {
				this.css({ top: $(window).height() / 2 - this.outerHeight() / 2 });
			},
			centerLeft: function() {
				this.css({ top: $(window).height() / 2 - this.outerHeight() / 2 });
			},
			centerRight: function() {
				this.css({ top: $(window).height() / 2 - this.outerHeight() / 2 });
			}
		},
		ontap: true,
		returns: 'object',

		get: function (id) {
			return $.noty.store.hasOwnProperty(id) ? $.noty.store[id] : false;
		},

		close: function (id) {
			return $.noty.get(id) ? $.noty.get(id).close() : false;
		},

		setText: function (id, text) {
			return $.noty.get(id) ? $.noty.get(id).setText(text) : false;
		},

		setType: function (id, type) {
			return $.noty.get(id) ? $.noty.get(id).setType(type) : false;
		},

		clearQueue: function () {
			$.noty.queue = [];
		},

		closeAll: function () {
			$.noty.clearQueue();
			$.each($.noty.store, function (id, noty) {
				noty.close();
			});
		},

		consumeAlert: function (options) {
			window.consumedAlert = window.alert;
			window.alert = function (text) {
				if (options) {
					options.text = text;
				}
				else {
					options = { text: text };
				}
				$.notyRenderer.init(options);
			};
		},

		stopConsumeAlert: function() {
			window.alert = window.consumedAlert;
		},

		defaults: {
			layout: 'top',
			theme: false,
			type: 'alert',
			text: '',
			dismissQueue: true,
			template: '<div class="noty_message"><span class="noty_text"></span><div class="noty_close"></div></div>',
			showEffect:  function(bar) { bar.animate({ height: 'toggle' }, 500, 'swing'); },
			hideEffect:  function(bar) { bar.animate({ height: 'toggle' }, 500, 'swing'); },
			timeout: false,
			force: false,
			modal: false,
			buttons: false,
			closeWith: ['click'],
			callback: {
				onShow: $.noop,
				afterShow: $.noop,
				onClose: $.noop,
				afterClose: $.noop
			}
		}
	};

	// Helper method
	window.noty = function(options) {
		return $.notyRenderer.init(options);
	}

	// This is for custom container
	$.fn.noty = function (options) {
		options.custom = $(this);
		return $.notyRenderer.init(options);
	};

})(jQuery);
