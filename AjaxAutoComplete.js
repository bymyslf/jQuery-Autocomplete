;(function ($, un) {
    //$ = jQuery shortcut to avoid library conflict
    //un = undefined to avoid undefined redifinition
    ajaxAutocomplete = function (context, options) {
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
            ajaxURL : '',
            returnJSON : true,
            searchDelay : 100,
            searchElement : '',
            requestCallback : function (data) {},
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
         };
        
         self.highlightTerm = function (value, term) {
        	return value.replace(new RegExp(["(?![^&;]+;)(?!<[^<>]*)(",
                   term.replace(/([\^\$\(\)\[\]\{\}\*\.\+\?\|\\])/gi, "\\$1"),
                   ")(?![^<>]*>)(?![^&;]+;)"].join(''), "gi"), "<strong>$1</strong>");
    	 }
        
         //Private methods
         function autocomplete(inputValue) {
            if (inputValue == '') {
                return;
            }
        
            if (xhrRequest) {
                xhrRequest.abort();  
            }
            
            $.get(currentOptions.ajaxURL, { term : inputValue }, function (data) {
                currentOptions.requestCallback(data);
            }, (currentOptions.returnJSON) ? 'json' : '');

            currentSelect = 0;
         };
        
         function selectOption() {
            execBlur = true;
            searchElement.val($('li.current a', resultsElement).attr('rel')).blur();
            self.clearAutocomplete();
         };
        
         function optionNavigation(upArrow) {
            upArrow = upArrow || false;
            execBlur = false;
            resultsElementChildren = $('li', resultsElement).length;

            if (upArrow) {
                currentSelect = (currentSelect == 0) ? resultsElementChildren - 1 : --currentSelect;
            } else {
                currentSelect = (++currentSelect % resultsElementChildren)
            }
            
            resultsElement.find('li.current')
                .removeClass('current')
                .end()
                .find('li:eq(' + currentSelect + ')')
                .addClass('current')
                .end();
         };
        
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
            
            //As of jQuery 1.7
            if ($.isFunction($().on)) {
                resultsElement.on({
                    mouseenter : function () {
                        execBlur = false;
                    },
                    mouseleave : function () {
                        execBlur = true;
                    }
                });
            } else {
                resultsElement.delegate('div', {
                    mouseenter : function () {
                        execBlur = false; 
                    },
                    mouseleave : function () {
                        execBlur = true;  
                    } 
                });
            } 
         };
        
         function init() {
            currentOptions = $.extend({}, defaultOptions, options);
            searchElement = $(currentOptions.searchElement, context).attr('autocomplete', 'off');
            resultsElement = $('.ajaxAuto', context);
            bindEvents();
         };
        
         //Run initializer
         init();
    };
    
    $.fn.ajaxAutocomplete = function (options) {   
        return this.each(function () {
            new ajaxAutocomplete(this, options);
        });
    };
})(jQuery, undefined);
