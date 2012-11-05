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

			_triggerEvent: function(type, args) {
				var callback = $.Event('noty'+type);
				self.wrapper.trigger(callback, [self].concat(args || []));
				return !callback.isDefaultPrevented();
			},

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

				// Generate noty container ifneeded
				if(!self.container.length) {
					// Use custom container ifprovided
					if(options.custom) {
						self.container = options.custom.addClass('noty_container_inline');
					}

					// Otherwise create one using jQuery
					else {
						self.container = $('<ul />', {
							'id': 'noty_container_'+self.options.layout,
							'class': 'noty_container'
						})
						.appendTo(self.options.custom || document.body);
					}

					// Apply any layout adjuters on window resize
					if((adjuster = $.noty.layouts[self.options.layout])) {
						$(window).bind('resize.'+self.options.id, function(event) {
							adjuster.call(self.container);
						})
						.triggerHandler('resize.'+self.options.id);
					}

					// Add new class
					self.container.addClass('i-am-new');
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

				// Set buttons ifavailable
				if(self.options.buttons) {
					self.options.closeWith = [];
					self.options.timeout = false;

					self.buttons = $('<div/>', {
						'class': 'noty_buttons'
					})
					.appendTo( $('.noty_bar', self.wrapper) )
					.append(
						$.map(self.options.buttons, function(button, i) {
							return $('<button/>', {
								'class': button.addClass || 'gray',
								'html': button.text,
								'click': function() {
									if($.isFunction(button.onClick)) {
										button.onClick.call( $(this), self );
									}
								}
							})[0]
						})
					);
				}

				// Attach events
				$.each(self.options.events, function(event, callback) {
					if($.isFunction(callback)) {
						self.wrapper.bind('noty'+callback, callback);
					}
				})

				// For easy access
				self.message = self.wrapper.find('.noty_message');
				self.closeButton = self.wrapper.find('.noty_close');

				// store noty for api
				$.noty.store[self.options.id] = self;
			},

			show: function(event) {
				// Append the container
				self.wrapper.appendTo(self.container);

				// Add close handlers to noty/buttons
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

				// Trigger show event
				self._triggerEvent('show', [ self ]);

				// After-animation methods
				function after() {
					self._triggerEvent('visible', [ self ]);
					self.shown = true;
				}

				// If an animation method was passed, use it and queue after()
				if($.isFunction(self.options.showEffect)) {
					self.wrapper.clearQueue().stop();
					self.options.showEffect.call(self, self.wrapper);
					self.wrapper.queue(after);
				}

				// Otherwise just invoke show() and after()
				else { self.wrapper.show(); after(); }

				// If noty is have a timeout option
				if(self.options.timeout) {
					clearTimeout(self._delay);
					self._delay = setTimeout(function() {
						self.close();
					}, parseInt(self.options.timeout, 10));
				}

				return self;

			},

			close: function(event) {
				if(self.closed) return;

				// If we are still waiting in the queue just delete from queue
				if(!self.shown) {
					$.noty.queue = $.map($.noty.queue, function(n ,i) {
						if(n.options.id != self.options.id) {
							return n;
						}
					});
					return;
				}

				// Add closing class
				self.wrapper.addClass('i-am-closing-now');

				// Trigger hide event
				self._triggerEvent('hid', [ self ]);

				function after() {
					// Trigger hidden event
					self._triggerEvent('hidden', [ self ]);

					// Modal Cleaning
					if(self.options.modal) { renderer.hideModalFor(self); }

					// Layout Cleaning
					renderer.setLayoutCountFor(self, -1);
					if(renderer.getLayoutCountFor(self) == 0) { self.wrapper.remove(); }

					// Make sure self.wrapper has not been removed before attempting to remove it
					if(typeof self.wrapper !== 'undefined' && self.wrapper !== null) {
						self.wrapper.remove();
						self.wrapper = null;
						self.closed = true;
					}

					// Delete noty reference from store
					delete $.noty.store[self.options.id]; 

					// Queue render
					if(!self.options.dismissQueue) {
						$.noty.ontap = true;
						renderer.render();
					}
				}

				// If an animation method was passed, use it and queue after()
				if($.isFunction(self.options.hideEffect)) {
					self.wrapper.clearQueue().stop();
					self.options.hideEffect.call(self, self.wrapper);
					self.wrapper.queue(after);
				}

				// Otherwise just invoke show() and after()
				else { self.wrapper.hide(); after(); }

			},

			setText: function(text) {
				if(!self.closed) {
					self.options.text = text;
					self.wrapper.find('.noty_text').html(text);
				}
				return self;
			},

			setType: function(type) {
				if(!self.closed) {
					self.options.type = type;
				}
				return self;
			}
		});

		self.init();
	};

	var renderer = $.notyRenderer = {
		_modal: $('<div/>', {
			'id': 'noty_modal', 
			'data': { 'noty_modal_count': 0 } 
		}),
		_modals: 0,

		init: function(options) {
			// Create new Noty
			var noty = new NotyObject(options);

			// Add it to the frontback of the queue depending on options
			$.noty.queue[noty.options.force ? 'unshift' : 'push'](noty);

			// Render the noty
			renderer.render();

			return ($.noty.returns == 'object') ? noty : noty.options.id;
		},

		render: function() {
			var instance = $.noty.queue[0];

			if($.type(instance) === 'object') {
				if(instance.options.dismissQueue) {
					renderer.show($.noty.queue.shift());
				} else {
					if($.noty.ontap) {
						renderer.show($.noty.queue.shift());
						$.noty.ontap = false;
					}
				}
			}

			// Queue is over
			else { $.noty.ontap = true; }
		},

		show: function(noty) {
			if(noty.options.modal) {
				renderer.createModalFor(noty);
				renderer.setModalCount(+1);
			}

			renderer.setLayoutCountFor(noty, +1);

			noty.show();
		},

		createModalFor: function(noty) {
			if(!renderer._modal[0].parentNode) {
				renderer._modal.prependTo(document.body).fadeIn('fast');
			}
		},

		hideModalFor: function(noty) {
			renderer.setModalCount(-1);

			if(renderer.getModalCount() == 0) {
				renderer._modal.fadeOut('fast', function() {
					renderer._modal.detach();
				});
			}
		},

		getLayoutCountFor: function(noty) {
			return noty.container.data('noty_layout_count') || 0;
		},

		setLayoutCountFor: function(noty, arg) {
			return noty.container.data('noty_layout_count', renderer.getLayoutCountFor(noty) + arg);
		},

		getModalCount: function() { return renderer._modals; },
		setModalCount: function(arg) { return (renderer._modals += arg); }
	};

	var win = $(window);

	$.noty = {
		queue: [],
		store: {},
		layouts: {
			center: function() {
				this[0].style.top = (win.height() / 2 - this.outerHeight() / 2) + 'px';
				this[0].style.left = (win.width() / 2 - this.outerWidth() / 2) + 'px';
			},
			centerLeft: function() {
				this[0].style.top = (win.height() / 2 - this.outerHeight() / 2) + 'px';
			},
			centerRight: function() {
				this[0].style.top = (win.height() / 2 - this.outerHeight() / 2) + 'px';
			},
			topCenter: function() {
				this[0].style.left = (win.width() / 2 - this.outerWidth() / 2) + 'px';
			},
			bottomCenter: function() {
				this[0].style.left = (win.width() / 2 - this.outerWidth() / 2) + 'px';
			}
		},
		ontap: true,
		returns: 'object',

		get: function(id) {
			return $.noty.store.hasOwnProperty(id) ? $.noty.store[id] : false;
		},

		close: function(id) {
			return $.noty.get(id) ? $.noty.get(id).close() : false;
		},

		setText: function(id, text) {
			return $.noty.get(id) ? $.noty.get(id).setText(text) : false;
		},

		setType: function(id, type) {
			return $.noty.get(id) ? $.noty.get(id).setType(type) : false;
		},

		clearQueue: function() {
			$.noty.queue = [];
		},

		closeAll: function() {
			$.noty.clearQueue();
			$.each($.noty.store, function(id, noty) {
				noty.close();
			});
		},

		consumeAlert: function(options) {
			window.alert = function(text) {
				if(options) {
					options.text = text;
				}
				else {
					options = { text: text };
				}
				renderer.init(options);
			};
		},

		stopConsumeAlert: function() {
			delete window.alert;
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
			events: {
				show: null,
				hide: null,
				shown: null,
				hidden: null
			}
		}
	};

	// Helper method
	window.noty = function(options) {
		return renderer.init(options);
	}

	// This is for custom container
	$.fn.noty = function(options) {
		options.custom = $(this);
		return renderer.init(options);
	};

})(jQuery);
