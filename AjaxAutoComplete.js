;(function ($, un) {
    //$ = jQuery shortcut to avoid library conflict
    //un = undefined to avoid undefined redifinition
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
         self.execBlur = true;
         self.xhrRequest = null;
         self.currentSelect = -1;
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
        clearAutocomplete : function () {
            clearTimeout(this.timeOut);
            this.currentSelect = -1;
            this.resultsElement.hide();
         },
         
         autocomplete : function (value) {
            var self = this;

            if (value.length < self.currentOptions.minChars) {
                self.clearAutocomplete();
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
            
            self.xhrRequest = $.get(self.currentOptions.source, { term : value, limit: self.currentOptions.limit }, function (data) {
                self.processResponse(value, data);
                self.currentOptions.requestCallback(data);
            }, (self.currentOptions.returnJSON) ? 'json' : '');
         },
         
         selectOption : function () {
            this.execBlur = true;
            var selected = this.resultsElement.find('.current'), 
                selectedData = selected 
                               ? $.data(selected[0], 'autocomplete') 
                               : {};
            this.searchElement.val(this.currentOptions.formatResult(selectedData)).blur();
            this.currentOptions.onSelectionCallback(selectedData);
            this.clearAutocomplete();
         },
         
         optionNavigation : function (upArrow) {
            upArrow = upArrow || false;
            this.execBlur = false;
          
            if (upArrow) {
                this.currentSelect = (this.currentSelect == 0) ? this.resultsElementChildren - 1 : --this.currentSelect;
            } else {
                this.currentSelect = (++this.currentSelect % this.resultsElementChildren)
            }
            
            this.resultsElement.find('.current')
                .removeClass('current')
                .end()
                .find('li:eq(' + this.currentSelect + ')')
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
            // Cache results if cache is not disabled:
            if (!this.currentOptions.noCache) {
                this.responseCache[term] = data;
            }

            this.fillSuggestionsList(term, data);   
         },

         fillSuggestionsList : function (term, data) {
            if (data.length == 0) {
                this.clearAutocomplete();
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
            this.currentSelect = -1;
         },
        
         bindEvents : function () {
            var self = this;

            self.searchElement.keydown(function (ev) {
                var keyCode = ev.keyCode || window.event.keyCode, 
                    keyCodes = Autocomplete.keyCodes;
              
                switch (keyCode) {
                    case keyCodes.ENTER: //Enter
                        self.selectOption();
                        break;
                    case keyCodes.ESCAPE: //Escape
                        self.clearAutocomplete(); 
                        break;
                    case keyCodes.UP: //Up and down arrows
                    case keyCodes.DOWN:
                        self.optionNavigation.call(self, keyCode == keyCodes.UP ? true : false);
                        self.currentOptions.upDownArrowsCallback.call(self, keyCode);
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
                    if (self.currentOptions.deferRequestBy > 0) {
                        self.timeOut = setTimeout(function () {
                            self.autocomplete(that.val());
                        }, self.currentOptions.deferRequestBy);
                    } else {
                        self.autocomplete(that.val());
                    }
                }   
            }).focus(function () {
                self.clearAutocomplete();
                self.currentOptions.onFocusCallback.call(self, $(this));
            }).blur(function () {
                if (self.execBlur) {
                    self.clearAutocomplete();
                    self.currentOptions.onBlurCallback.call(self, $(this));
                }
            });
            
            self.resultsElement.mouseenter(function () {
                self.execBlur = false;
            }).mouseleave(function () {
                self.execBlur = true;
            }).mouseover(function (ev) {
                if (ev.target.nodeName && ev.target.nodeName.toUpperCase() == 'LI') {
                    self.resultsElement.find('.current').removeClass('current');
                    $(ev.target).addClass('current');
                }
            }).click(function () {
                self.selectOption();
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
