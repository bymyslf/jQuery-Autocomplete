;(function ($, un) {
    'use strict';
    
    function Autocomplete(context, options) {
        var self = this,
            defaultOptions = {
                source : '',
                limit : 10,
                minChars : 1,
                returnJSON : true,
                deferRequestBy : 0,
                noCache: false,
                formatItem : function (data) { return data; }, // Provides advanced markup for an item. For each row of results, this function will be called
                formatResult : function (data) { return data; }, // Provides the formatting for the value to be put into the input field
                lookupPredicate : function (row, term) { // Provides data filtering for local data
                    return row.toLowerCase().indexOf(term.toLowerCase()) !== -1;
                }, 
                requestCallback : function (data) {},
                onSelectionCallback : function (data) {},
                upDownArrowsCallback : function (key) {},
                onFocusCallback : function (element) {},
                onBlurCallback : function (element) {}
            };

         self.timeOut = null;
         self.currentOptions = $.extend({}, defaultOptions, options);
         self.isLocal = $.isArray(self.currentOptions.source) ? true : false;
         self.searchElement = $(context).attr('autocomplete', 'off');
         self.resultsElement = $('<ul></ul>', { class : 'autocomplete-results' }).insertAfter(self.searchElement);
         self.responseCache = [];
         self.executeBlur = true;
         self.xhrRequest = null;
         self.currentIndex = -1;
         self.resultsElementChildren = 0;
         
         self.bindEvents();
    };

    Autocomplete.highlightTerm = function (value, term) {
        return value.replace(new RegExp(["(?![^&;]+;)(?!<[^<>]*)(",
                term.replace(/([\^\$\(\)\[\]\{\}\*\.\+\?\|\\])/gi, "\\$1"),
                ")(?![^<>]*>)(?![^&;]+;)"].join(''), "gi"), "<strong>$1</strong>");
    };

    Autocomplete.keyCodes = {
        ENTER : 13,
        ESCAPE : 27,
        UP : 38,
        DOWN : 40,
        LETTERS_NUMBERS_MIN : 48,
        LETTERS_NUMBERS_MAX : 90,
        NUM_PAD_MIN : 96,
        NUM_PAD_MAX : 105,
        SUBTRACT : 109,
        FORWARD_SLASH : 191,
        BACK_SLASH : 220,
        BACKSPACE : 8,
        DELETE : 46
    };

    Autocomplete.prototype = {
        clearSuggestions : function () {
            clearTimeout(this.timeOut);
            this.currentIndex = -1;
            this.resultsElement.hide();
         },
         
         getSuggestions : function (value) {
            var self = this, 
                options = self.currentOptions;

            if (value.length < options.minChars) {
                self.clearSuggestions();
                return;
            }
            
            var localData = self.isLocal ? self.getLocalData(value) : self.responseCache[value];
            if (localData) {
                self.fillSuggestionsList(value, localData);
                return;
            }

            if (self.xhrRequest) {
                self.xhrRequest.abort();  
            }
            
            self.xhrRequest = $.get(options.source, { term : value, limit: options.limit }, function (data) {
                self.processResponse(value, data);
                if ($.isFunction(options.requestCallback)) {
                    options.requestCallback(data);
                }
            }, (options.returnJSON) ? 'json' : '');
         },
         
         selectSuggestion : function () {
            this.executeBlur = true;

            var options = this.currentOptions,
                selected = this.resultsElement.find('.current'), 
                selectedData = selected ? $.data(selected[0], 'autocomplete') : {};

            this.searchElement.val(options.formatResult(selectedData)).trigger('blur');
            if ($.isFunction(options.onSelectionCallback)) {
                options.onSelectionCallback(selectedData);
            }
            this.clearSuggestions();
         },
         
         suggestionNavigation : function (upArrow) {
            upArrow = upArrow || false;
            this.executeBlur = false;
          
            if (upArrow) {
                this.currentIndex = (this.currentIndex === 0) ? this.resultsElementChildren - 1 : --this.currentIndex;
            } else {
                this.currentIndex = (++this.currentIndex % this.resultsElementChildren)
            }
            
            this.resultsElement.find('.current')
                .removeClass('current')
                .end()
                .find('li:eq(' + this.currentIndex + ')')
                .addClass('current')
                .end();
         },
         
         limitNumberOfItems : function (dataLength) {
		    return this.currentOptions.limit && this.currentOptions.limit < dataLength
			    ? this.currentOptions.limit
			    : dataLength;
	     },

         getLocalData : function (term) {
            var predicate = this.currentOptions.lookupPredicate; 

            return $.grep(this.currentOptions.source, function (row) {
                return predicate(row, term);
            });
         },

         processResponse : function (term, data) {
            // Cache results if cache is not disabled
            if (!this.currentOptions.noCache) {
                this.responseCache[term] = data;
            }

            this.fillSuggestionsList(term, data);   
         },

         fillSuggestionsList : function (term, data) {
            if (data.length == 0) {
                this.clearSuggestions();
                return;
            }

            var totalItems = this.limitNumberOfItems(data.length),
                docFragment = document.createDocumentFragment(),
                listItem, resultItem, formatedItem;

            this.resultsElement.empty();
            for (var i = 0; i < totalItems; ++i) {
                formatedItem = this.currentOptions.formatItem(data[i]);
                listItem = document.createElement('li');
                listItem.innerHTML = Autocomplete.highlightTerm(formatedItem, term);
                docFragment.appendChild(listItem);
                $.data(listItem, 'autocomplete', data[i]);
            }
            this.resultsElement.append(docFragment).show();
            this.resultsElementChildren = $('li', this.resultsElement).length;
            this.currentIndex = -1;
         },
        
         bindEvents : function () {
            var self = this, 
                options = self.currentOptions;

            self.searchElement.keydown(function (ev) {
                var keyCode = ev.keyCode || window.event.keyCode, 
                    keyCodes = Autocomplete.keyCodes;
              
                switch (keyCode) {
                    case keyCodes.ENTER: //Enter
                        self.selectSuggestion();
                        break;
                    case keyCodes.ESCAPE: //Escape
                        self.clearSuggestions(); 
                        break;
                    case keyCodes.UP: //Up and down arrows
                    case keyCodes.DOWN:
                        self.suggestionNavigation.call(self, keyCode == keyCodes.UP ? true : false);
                        if ($.isFunction(options.upDownArrowsCallback)) {
                            options.upDownArrowsCallback(keyCode);
                        }
                        break;
                }
            }).keyup(function (ev) {
                var that = $(this),
                    keyCode = ev.keyCode || window.event.keyCode, 
                    keyCodes = Autocomplete.keyCodes;
                    
                if ((keyCode >= keyCodes.LETTERS_NUMBERS_MIN && keyCode <= keyCodes.LETTERS_NUMBERS_MAX) 
                    || (keyCode >= keyCodes.NUM_PAD_MIN && keyCode <= keyCodes.NUM_PAD_MAX) 
                    || keyCode == keyCodes.SUBTRACT 
                    || keyCode == keyCodes.FORWARD_SLASH || keyCode == keyCodes.BACK_SLASH 
                    || keyCode == keyCodes.BACKSPACE 
                    || keyCode == keyCodes.DELETE) { //Only numbers, letters, hyphen, back slash, forward slash, backspace, delete
                    if (options.deferRequestBy > 0) {
                        self.timeOut = setTimeout(function () {
                            self.getSuggestions(that.val());
                        }, options.deferRequestBy);
                    } else {
                        self.getSuggestions(that.val());
                    }
                }   
            }).focus(function () {
                self.clearSuggestions();
                if ($.isFunction(options.onFocusCallback)) {
                    options.onFocusCallback($(this));
                }
            }).blur(function () {
                if (self.executeBlur) {
                    self.clearSuggestions();
                    if ($.isFunction(options.onBlurCallback)) {
                        options.onBlurCallback($(this));
                    }
                }
            });
            
            self.resultsElement.mouseenter(function () {
                self.executeBlur = false;
            }).mouseleave(function () {
                self.executeBlur = true;
            }).mouseover(function (ev) {
                if (ev.target.nodeName && ev.target.nodeName.toUpperCase() == 'LI') {
                    self.resultsElement.find('.current').removeClass('current');
                    $(ev.target).addClass('current');
                }
            }).click(function () {
                self.selectSuggestion();
            });
         }
    };
    
    $.fn.autocomplete = function (options) {   
        return this.each(function () {
            var that = $(this);

            if (that.data('autocomplete')) {
                that.data('autocomplete');    
            } else {
                var obj = new Autocomplete(this, options);
                that.data('autocomplete', obj);
            }
        });
    };
})(jQuery, undefined);
