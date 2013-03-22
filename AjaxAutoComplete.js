;(function ($, un) {
    //$ = jQuery shortcut to avoid library conflict
    //un = undefined to avoid undefined redifinition
    AjaxAutocomplete = function (context, options) {
        var self = this,
            timeOut = null,
            searchElement = null,
            resultsElement = null,
            currentOptions = {},
            execBlur = true,
            xhrRequest = null,
            currentSelect = -1,
            resultsElementChildren = 0, 
            defaultOptions = {
                url : '',
                limit : 10,
                returnJSON : true,
                searchDelay : 10,
                searchElement : '',
                formatItem : function (data) { return data; }, // Provides advanced markup for an item. For each row of results, this function will be called
                formatResult : function (data) { return data; }, // Provides the formatting for the value to be put into the input field
                requestCallback : function (data) {},
                onSelectionCallback : function (data) {},
                upDownArrowsCallback : function (key) {},
                onFocusCallback : function (element) {},
                onBlurCallback : function (element) {}
            },
            keyCodes = {
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
               
         //Public methods
         self.clearAutocomplete = function () {
            clearTimeout(timeOut);
            currentSelect = -1;
            resultsElement.hide();
         }
        
         self.highlightTerm = function (value, term) {
        	return value.replace(new RegExp(["(?![^&;]+;)(?!<[^<>]*)(",
                   term.replace(/([\^\$\(\)\[\]\{\}\*\.\+\?\|\\])/gi, "\\$1"),
                   ")(?![^<>]*>)(?![^&;]+;)"].join(''), "gi"), "<strong>$1</strong>");
    	 }
        
         //Private methods
         function autocomplete(inputValue) {
            if (inputValue == '') {
            	self.clearAutocomplete();
                return;
            }
        
            if (xhrRequest) {
                xhrRequest.abort();  
            }
            
            xhrRequest = $.get(currentOptions.url, { term : inputValue, limit: currentOptions.limit }, function (data) {
                fillList(inputValue, data);
                resultsElementChildren = $('li', resultsElement).length;
                currentOptions.requestCallback(data);
            }, (currentOptions.returnJSON) ? 'json' : '');

            currentSelect = -1;
         }
        
         function selectOption() {
            execBlur = true;
            var selected = resultsElement.find('.current'), 
                selectedData = selected 
                               ? $.data(selected[0], 'ajax-autocomplete') 
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

         function fillList(term, data) {
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
                listItem.innerHTML = self.highlightTerm(formatedItem, term);
                docFragment.appendChild(listItem);
                $.data(listItem, 'ajax-autocomplete', data[i]);
            }
            resultsElement.append(docFragment).show();
         }
        
         function bindEvents() {
            searchElement.keydown(function (ev) {
                var that = $(this),
                    keyCode = ev.keyCode || window.event.keyCode;
              
                if (keyCode == keyCodes.ENTER) { //Enter
                    selectOption();
                } else if (keyCode == keyCodes.ESCAPE) { //Escape
                    self.clearAutocomplete(); 
                } else if (keyCode == keyCodes.UP || keyCode == keyCodes.DOWN) { //Up and down arrows
                    optionNavigation.call(self, keyCode == keyCodes.UP ? true : false);
                    currentOptions.upDownArrowsCallback.call(self, keyCode);
                } else if ((keyCode >= keyCodes.LETTERS_NUMBERS_MIN && keyCode <= keyCodes.LETTERS_NUMBERS_MAX) 
                  || (keyCode >= keyCodes.NUM_PAD_MIN && keyCode <= keyCodes.NUM_PAD_MAX) 
                  || keyCode == keyCodes.SUBTRACT 
                  || keyCode == keyCodes.FORWARD_SLASH || keyCode == keyCodes.BACK_SLASH 
                  || keyCode == keyCodes.BACKSPACE 
                  || keyCode == keyCodes.DELETE) { //Only numbers, letters, hyphen, back slash, forward slash, backspace, delete
                    timeOut = setTimeout(function () { 
                        autocomplete(that.val());
                    }, currentOptions.searchDelay);
                } else {
                    self.clearAutocomplete();
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
            searchElement = $(context).attr('autocomplete', 'off');
            resultsElement = $('<ul></ul>', { class : 'ajax-autocomplete-results' }).insertAfter(searchElement);
            bindEvents();
         }
        
         //Run initializer
         init();
    };
    
    $.fn.ajaxAutocomplete = function (options) {   
        return this.each(function () {
            new AjaxAutocomplete(this, options);
        });
    };
})(jQuery, undefined);
