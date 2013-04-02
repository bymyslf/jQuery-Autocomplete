;(function ($, un) {
    //$ = jQuery shortcut to avoid library conflict
    //un = undefined to avoid undefined redifinition
    function Autocomplete(context, options) {
        var self = this,
            timeOut = null,
            searchElement = null,
            resultsElement = null,
            currentOptions = {},
            execBlur = true,
            xhrRequest = null,
            currentSelect = -1,
            resultsElementChildren = 0,
            isLocal = false,
            responseCache = [],
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
               
         //Public methods
         self.clearAutocomplete = function () {
            clearTimeout(timeOut);
            currentSelect = -1;
            resultsElement.hide();
         }

         //Private methods
         function autocomplete(value) {
            if (value.length < currentOptions.minChars) {
                self.clearAutocomplete();
                return;
            }
            
            var localData = isLocal ? getLocalData(value) : responseCache[value];
   
            if (localData) {
                fillSuggestionsList(value, localData);
                return;
            }

            if (xhrRequest) {
                xhrRequest.abort();  
            }
            
            xhrRequest = $.get(currentOptions.source, { term : value, limit: currentOptions.limit }, function (data) {
                processResponse(value, data);
                currentOptions.requestCallback(data);
            }, (currentOptions.returnJSON) ? 'json' : '');
         }
        
         function selectOption() {
            execBlur = true;
            var selected = resultsElement.find('.current'), 
                selectedData = selected 
                               ? $.data(selected[0], 'autocomplete') 
                               : {};
            searchElement.val(currentOptions.formatResult(selectedData)).blur();
            currentOptions.onSelectionCallback(selectedData);
            self.clearAutocomplete();
         }
        
         function optionNavigation(upArrow) {
            upArrow = upArrow || false;
            execBlur = false;
          
            if (upArrow) {
                currentSelect = (currentSelect == 0) ? resultsElementChildren - 1 : --currentSelect;
            } else {
                currentSelect = (++currentSelect % resultsElementChildren)
            }
            
            resultsElement.find('.current')
                .removeClass('current')
                .end()
                .find('li:eq(' + currentSelect + ')')
                .addClass('current')
                .end();
         }

         function limitNumberOfItems(dataLength) {
		    return currentOptions.limit && currentOptions.limit < dataLength
			    ? currentOptions.limit
			    : dataLength;
	     }

         function getLocalData(term) {
            var predicate = currentOptions.lookupPredicate; 
            return $.grep(currentOptions.source, function (row) {
                return predicate(row, term);
            });
         }

         function processResponse(term, data) {
            // Cache results if cache is not disabled:
            if (!currentOptions.noCache) {
                responseCache[term] = data;
            }

            fillSuggestionsList(term, data);   
         }

         function fillSuggestionsList(term, data) {
            if (data.length == 0) {
                return;
            }

            var totalItems = limitNumberOfItems(data.length),
                docFragment = document.createDocumentFragment(),
                listItem, resultItem, formatedItem;

            resultsElement.empty();
            for (var i = 0; i < totalItems; ++i) {
                formatedItem = currentOptions.formatItem(data[i]);
                listItem = document.createElement('li');
                listItem.innerHTML = Autocomplete.highlightTerm(formatedItem, term);
                docFragment.appendChild(listItem);
                $.data(listItem, 'autocomplete', data[i]);
            }
            resultsElement.append(docFragment).show();
            resultsElementChildren = $('li', resultsElement).length;
            currentSelect = -1;
         }
        
         function bindEvents() {
            searchElement.keydown(function (ev) {
                var keyCode = ev.keyCode || window.event.keyCode, 
                    keyCodes = Autocomplete.keyCodes;
              
                switch (keyCode) {
                    case keyCodes.ENTER: //Enter
                        selectOption();
                        break;
                    case keyCodes.ESCAPE: //Escape
                        self.clearAutocomplete(); 
                        break;
                    case keyCodes.UP: //Up and down arrows
                    case keyCodes.DOWN:
                        optionNavigation.call(self, keyCode == keyCodes.UP ? true : false);
                        currentOptions.upDownArrowsCallback.call(self, keyCode);
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
                    if (currentOptions.deferRequestBy > 0) {
                        timeOut = setTimeout(function () { 
                            autocomplete(that.val());
                        }, currentOptions.deferRequestBy);
                    } else {
                        autocomplete(that.val());
                    }
                }   
            }).focus(function () {
                self.clearAutocomplete();
                currentOptions.onFocusCallback.call(self, $(this));
            }).blur(function () {
                if (execBlur) {
                    self.clearAutocomplete();
                    currentOptions.onBlurCallback.call(self, $(this));
                }
            });
            
            resultsElement.mouseenter(function () {
                execBlur = false;
            }).mouseleave(function () {
                execBlur = true;
            }).mouseover(function (ev) {
                if (ev.target.nodeName && ev.target.nodeName.toUpperCase() == 'LI') {
                    resultsElement.find('.current').removeClass('current');
                    $(ev.target).addClass('current');
                }
            }).click(function () {
                selectOption();
            });
         }
        
         function init() {
            currentOptions = $.extend({}, defaultOptions, options);
            isLocal = $.isArray(currentOptions.source) ? true : false;
            searchElement = $(context).attr('autocomplete', 'off');
            resultsElement = $('<ul></ul>', { class : 'autocomplete-results' }).insertAfter(searchElement);
            bindEvents();
         }
        
         //Run initializer
         init();
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
