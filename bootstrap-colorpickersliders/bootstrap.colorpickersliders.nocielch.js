/*jshint undef: true, unused:true, browser:true */
/*global jQuery: true, tinycolor: false */

/*!=========================================================================
 *  Bootstrap Color Picker Sliders without CIE Lch support
 *  v2.1.7
 *
 *  Stripped CIE Lch support due to smaller code base and better performance.
 *
 *      https://github.com/istvan-ujjmeszaros/bootstrap-colorpickersliders
 *      http://virtuosoft.eu/code/bootstrap-colorpickersliders/
 *
 *  Copyright 2013 István Ujj-Mészáros
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 *  Requirements:
 *
 *      TinyColor: https://github.com/bgrins/TinyColor
 *
 *  Using color math algorithms from EasyRGB Web site:
 *      http://www.easyrgb.com/index.php?X=MATH
 * ====================================================================== */

(function($) {
    "use strict";

    $.fn.ColorPickerSliders = function(options) {

        return this.each(function() {

            var alreadyinitialized = false,
                    settings,
                    triggerelement = $(this),
                    triggerelementisinput = triggerelement.is("input"),
                    container,
                    popover_container,
                    elements,
                    connectedinput = false,
                    swatches,
                    rendermode = false,
                    visible = false,
                    dragTarget = false,
                    lastUpdateTime = 0,
                    color = {
                        tiny: null,
                        hsla: null,
                        rgba: null
                    };

            init();

            function _initSettings() {
                if (typeof options === "undefined") {
                    options = {};
                }

                settings = $.extend({
                    color: 'hsl(342, 52%, 70%)',
                    size: 'default', // sm | default | lg
                    animation: true,
                    placement: 'auto',
                    trigger: 'focus',   // focus | manual
                    preventtouchkeyboardonshow: true,
                    title: '',
                    swatches: ['FFFFFF', 'C0C0C0', '808080', '000000', 'FF0000', '800000', 'FFFF00', '808000', '00FF00', '008000', '00FFFF', '008080', '0000FF', '000080', 'FF00FF', '800080'], // array or false to disable swatches
                    customswatches: 'colorpickkersliders', // false or a grop name
                    connectedinput: false, // can be a jquery object or a selector
                    flat: false,
                    updateinterval: 30, // update interval of the sliders while in drag (ms)
                    previewontriggerelement: true,
                    previewcontrasttreshold: 30,
                    previewformat: 'rgb', // rgb | hsl | hex
                    titleswatchesadd: "Add color to swatches",
                    titleswatchesremove: "Remove color from swatches",
                    titleswatchesreset: "Reset to default swatches",
                    order: {},
                    labels: {},
                    onchange: function() {
                    }
                }, options);

                if (options.hasOwnProperty('order')) {
                    settings.order = $.extend({
                        opacity: false,
                        hsl: false,
                        rgb: false,
                        preview: false
                    }, options.order);
                }
                else {
                    settings.order = {
                        opacity: 0,
                        hsl: 1,
                        rgb: 2,
                        preview: 3
                    };
                }

                if (!options.hasOwnProperty('labels')) {
                    options.labels = {};
                }

                settings.labels = $.extend({
                    hslhue: 'HSL-Hue',
                    hslsaturation: 'HSL-Saturation',
                    hsllightness: 'HSL-Lightness',
                    rgbred: 'RGB-Red',
                    rgbgreen: 'RGB-Green',
                    rgbblue: 'RGB-Blue',
                    opacity: 'Opacity',
                    preview: 'Preview'
                }, options.labels);
            }

            function init() {
                if (alreadyinitialized) {
                    return;
                }

                alreadyinitialized = true;

                rendermode = $.fn.ColorPickerSliders.detectWhichGradientIsSupported();

                if (rendermode === "filter") {
                    rendermode = false;
                }

                if (!rendermode && $.fn.ColorPickerSliders.svgSupported()) {
                    rendermode = "svg";
                }

                _initSettings();

                // force preview when browser doesn't support css gradients
                if ((!settings.order.hasOwnProperty('preview') || settings.order.preview === false) && !rendermode) {
                    settings.order.preview = 10;
                }

                _initConnectedElements();
                _initColor();
                _initConnectedinput();
                _updateTriggerelementColor();
                _updateConnectedInput();

                if (settings.flat) {
                    showFlat();
                }

                _bindEvents();
            }

            function _buildComponent() {
                _initElements();
                _renderSwatches();
                _updateAllElements();
                _bindControllerEvents();
            }

            function _initColor() {
                if (triggerelementisinput) {
                    color.tiny = tinycolor(triggerelement.val());

                    if (!color.tiny.format) {
                        color.tiny = tinycolor(settings.color);
                    }
                }
                else {
                    color.tiny = tinycolor(settings.color);
                }

                color.hsla = color.tiny.toHsl();
                color.rgba = color.tiny.toRgb();
            }

            function _initConnectedinput() {
                if (settings.connectedinput) {
                    if (settings.connectedinput instanceof jQuery) {
                        connectedinput = settings.connectedinput;
                    }
                    else {
                        connectedinput = $(settings.connectedinput);
                    }
                }
            }

            function updateColor(newcolor, disableinputupdate) {
                var updatedcolor = tinycolor(newcolor);

                if (updatedcolor.format) {
                    color.tiny = updatedcolor;
                    color.hsla = updatedcolor.toHsl();
                    color.rgba = updatedcolor.toRgb();

                    if (settings.flat || visible) {
                        container.removeClass("cp-unconvertible-cie-color");
                        _updateAllElements(disableinputupdate);
                    }
                    else {
                        if (!disableinputupdate) {
                            _updateConnectedInput();
                        }
                        _updateTriggerelementColor();
                    }

                    return true;
                }
                else {
                    return false;
                }
            }

            function show() {
                if (visible) {
                    return;
                }

                showPopover();

                setTimeout(function(){
                    visible = true;
                },200);
            }

            function hide() {
                visible = false;
                hidePopover();
            }

            function showPopover() {
                popover_container = $('<div class="cp-popover-container"></div>').appendTo('body');

                container = $('<div class="cp-container"></div>').appendTo(popover_container);
                container.html(_getControllerHtml());

                switch(settings.size) {
                    case "sm":
                        container.addClass("cp-container-sm");
                        break;
                    case "lg":
                        container.addClass("cp-container-lg");
                        break;
                }

                _buildComponent();

                triggerelement.popover({
                    html : true,
                    animation: settings.animation,
                    trigger: 'manual',
                    title: settings.title,
                    placement: settings.placement,
                    container: popover_container,
                    content: function() {
                        return container;
                    }
                });

                triggerelement.popover('show');
            }

            function hidePopover() {
                triggerelement.popover('destroy');

                // can not use hidden.bs.popover event because it is triggered before animation ends (probably an issue in bs 3.0.3)
                setTimeout(function(){
                    if (popover_container instanceof jQuery) {
                        popover_container.remove();
                    }
                }, 150);
            }

            function _getControllerHtml() {
                var sliders = [],
                    color_picker_html = '';

                if (settings.order.opacity !== false) {
                    sliders[settings.order.opacity] = '<div class="cp-slider cp-opacity cp-transparency"><span>' + settings.labels.opacity + '</span><div class="cp-marker"></div></div>';
                }

                if (settings.order.hsl !== false) {
                    sliders[settings.order.hsl] = '<div class="cp-slider cp-hslhue cp-transparency"><span>' + settings.labels.hslhue + '</span><div class="cp-marker"></div></div><div class="cp-slider cp-hslsaturation cp-transparency"><span>' + settings.labels.hslsaturation + '</span><div class="cp-marker"></div></div><div class="cp-slider cp-hsllightness cp-transparency"><span>' + settings.labels.hsllightness + '</span><div class="cp-marker"></div></div>';
                }

                if (settings.order.rgb !== false) {
                    sliders[settings.order.rgb] = '<div class="cp-slider cp-rgbred cp-transparency"><span>' + settings.labels.rgbred + '</span><div class="cp-marker"></div></div><div class="cp-slider cp-rgbgreen cp-transparency"><span>' + settings.labels.rgbgreen + '</span><div class="cp-marker"></div></div><div class="cp-slider cp-rgbblue cp-transparency"><span>' + settings.labels.rgbblue + '</span><div class="cp-marker"></div></div>';
                }

                if (settings.order.preview !== false) {
                    sliders[settings.order.preview] = '<div class="cp-preview cp-transparency"><input type="text" readonly="readonly"></div>';
                }

                color_picker_html += '<div class="cp-sliders">';

                for (var i = 0; i < sliders.length; i++) {
                    if (typeof sliders[i] === "undefined") {
                        continue;
                    }

                    color_picker_html += sliders[i];
                }

                color_picker_html += '</div>';

                if (settings.swatches) {
                    color_picker_html += '<div class="cp-swatches clearfix"><button type="button" class="add btn btn-default" title="' + settings.titleswatchesadd + '"><span class="glyphicon glyphicon-floppy-save"></span></button><button type="button" class="remove btn btn-default" title="' + settings.titleswatchesremove + '"><span class="glyphicon glyphicon-trash"></span></button><button type="button" class="reset btn btn-default" title="' + settings.titleswatchesreset + '"><span class="glyphicon glyphicon-repeat"></span></button><ul></ul></div>';
                }

                return color_picker_html;
            }

            function _initElements() {
                elements = {
                    actualswatch: false,
                    swatchescontainer: $(".cp-swatches", container),
                    swatches: $(".cp-swatches ul", container),
                    swatches_add: $(".cp-swatches button.add", container),
                    swatches_remove: $(".cp-swatches button.remove", container),
                    swatches_reset: $(".cp-swatches button.reset", container),
                    all_sliders: $(".cp-sliders, .cp-preview input", container),
                    sliders: {
                        hue: $(".cp-hslhue span", container),
                        hue_marker: $(".cp-hslhue .cp-marker", container),
                        saturation: $(".cp-hslsaturation span", container),
                        saturation_marker: $(".cp-hslsaturation .cp-marker", container),
                        lightness: $(".cp-hsllightness span", container),
                        lightness_marker: $(".cp-hsllightness .cp-marker", container),
                        opacity: $(".cp-opacity span", container),
                        opacity_marker: $(".cp-opacity .cp-marker", container),
                        red: $(".cp-rgbred span", container),
                        red_marker: $(".cp-rgbred .cp-marker", container),
                        green: $(".cp-rgbgreen span", container),
                        green_marker: $(".cp-rgbgreen .cp-marker", container),
                        blue: $(".cp-rgbblue span", container),
                        blue_marker: $(".cp-rgbblue .cp-marker", container),
                        preview: $(".cp-preview input", container)
                    }
                };

                if (!settings.customswatches) {
                    elements.swatches_add.hide();
                    elements.swatches_remove.hide();
                    elements.swatches_reset.hide();
                }
            }

            function showFlat() {
                if (settings.flat) {
                    if (triggerelementisinput) {
                        container = $('<div class="cp-container"></div>').insertAfter(triggerelement);
                    }
                    else {
                        container = $('<div class="cp-container"></div>');
                        triggerelement.append(container);
                    }

                    container.append(_getControllerHtml());

                    _buildComponent();
                }
            }

            function _initConnectedElements() {
                if (settings.connectedinput instanceof jQuery) {
                    settings.connectedinput.add(triggerelement);
                }
                else if (settings.connectedinput === false) {
                    settings.connectedinput = triggerelement;
                }
                else {
                    settings.connectedinput = $(settings.connectedinput).add(triggerelement);
                }
            }

            function _bindEvents() {
                triggerelement.on('colorpickersliders.updateColor', function(e, newcolor) {
                    updateColor(newcolor);
                });

                triggerelement.on('colorpickersliders.show', function() {
                    show();
                });

                triggerelement.on('colorpickersliders.hide', function() {
                    hide();
                });

                if (!settings.flat && settings.trigger === 'focus') {
                    // we need tabindex defined to be focusable
                    if (typeof triggerelement.attr("tabindex") === "undefined") {
                        triggerelement.attr("tabindex", -1);
                    }

                    if (settings.preventtouchkeyboardonshow) {
                        $(triggerelement).prop("readonly", true);

                        $(triggerelement).on("click", function(ev) {
                            if (visible) {
                                $(triggerelement).prop("readonly", false);
                                ev.stopPropagation();
                            }
                        });
                    }

                    // buttons doesn't get focus in webkit browsers
                    // https://bugs.webkit.org/show_bug.cgi?id=22261
                    // and only input and button are focusable on iPad
                    // so it is safer to register click on any other than inputs
                    if (!triggerelementisinput) {
                        $(triggerelement).on("click", function(ev) {
                            show();

                            ev.stopPropagation();
                        });
                    }

                    $(triggerelement).on("focus", function(ev) {
                        show();

                        ev.stopPropagation();
                    });

                    $(triggerelement).on("blur", function(ev) {
                        hide();

                        if (settings.preventtouchkeyboardonshow) {
                            $(triggerelement).prop("readonly", true);
                        }

                        ev.stopPropagation();
                    });
                }

                if (connectedinput) {
                    connectedinput.on('keyup change', function() {
                        var $input = $(this);

                        updateColor($input.val(), true);
                    });
                }

            }

            function _bindControllerEvents() {
                container.on("contextmenu", function(ev) {
                    ev.preventDefault();
                    return false;
                });

                $(document).on("colorpickersliders.changeswatches", function() {
                    _renderSwatches();
                });

                elements.swatches.on("touchstart mousedown click", "li span", function(ev) {
                    var color = $(this).css("background-color");
                    updateColor(color);
                    ev.preventDefault();
                });

                elements.swatches_add.on("touchstart mousedown click", function(ev) {
                    _addCurrentColorToSwatches();
                    ev.preventDefault();
                    ev.stopPropagation();
                });

                elements.swatches_remove.on("touchstart mousedown click", function(ev) {
                    _removeActualColorFromSwatches();
                    ev.preventDefault();
                    ev.stopPropagation();
                });

                elements.swatches_reset.on("touchstart touchend mousedown click", function(ev) {
                    // prevent multiple fire on android...
                    if (ev.type === "click" || ev.type === "touchend") {
                        _resetSwatches();
                    }
                    ev.preventDefault();
                    ev.stopImmediatePropagation();
                });

                elements.sliders.hue.parent().on("touchstart mousedown", function(ev) {
                    ev.preventDefault();

                    if (ev.which > 1) {
                        return;
                    }

                    dragTarget = "hue";

                    var percent = _updateMarkerPosition(dragTarget, ev);

                    _updateColorsProperty('hsla', 'h', 3.6 * percent);

                    _updateAllElements();
                });

                elements.sliders.saturation.parent().on("touchstart mousedown", function(ev) {
                    ev.preventDefault();

                    if (ev.which > 1) {
                        return;
                    }

                    dragTarget = "saturation";

                    var percent = _updateMarkerPosition(dragTarget, ev);

                    _updateColorsProperty('hsla', 's', percent / 100);

                    _updateAllElements();
                });

                elements.sliders.lightness.parent().on("touchstart mousedown", function(ev) {
                    ev.preventDefault();

                    if (ev.which > 1) {
                        return;
                    }

                    dragTarget = "lightness";

                    var percent = _updateMarkerPosition(dragTarget, ev);

                    _updateColorsProperty('hsla', 'l', percent / 100);

                    _updateAllElements();
                });

                elements.sliders.opacity.parent().on("touchstart mousedown", function(ev) {
                    ev.preventDefault();

                    if (ev.which > 1) {
                        return;
                    }

                    dragTarget = "opacity";

                    var percent = _updateMarkerPosition(dragTarget, ev);

                    _updateColorsProperty('hsla', 'a', percent / 100);

                    _updateAllElements();
                });

                elements.sliders.red.parent().on("touchstart mousedown", function(ev) {
                    ev.preventDefault();

                    if (ev.which > 1) {
                        return;
                    }

                    dragTarget = "red";

                    var percent = _updateMarkerPosition(dragTarget, ev);

                    _updateColorsProperty('rgba', 'r', 2.55 * percent);

                    _updateAllElements();
                });

                elements.sliders.green.parent().on("touchstart mousedown", function(ev) {
                    ev.preventDefault();

                    if (ev.which > 1) {
                        return;
                    }

                    dragTarget = "green";

                    var percent = _updateMarkerPosition(dragTarget, ev);

                    _updateColorsProperty('rgba', 'g', 2.55 * percent);

                    _updateAllElements();
                });

                elements.sliders.blue.parent().on("touchstart mousedown", function(ev) {
                    ev.preventDefault();

                    if (ev.which > 1) {
                        return;
                    }

                    dragTarget = "blue";

                    var percent = _updateMarkerPosition(dragTarget, ev);

                    _updateColorsProperty('rgba', 'b', 2.55 * percent);

                    _updateAllElements();
                });

                elements.sliders.preview.on("click", function() {
                    this.select();
                });

                $(document).on("touchmove mousemove", function(ev) {
                    if (!dragTarget) {
                        return;
                    }

                    var percent = _updateMarkerPosition(dragTarget, ev);

                    switch (dragTarget) {
                        case "hue":
                            _updateColorsProperty('hsla', 'h', 3.6 * percent);
                            break;
                        case "saturation":
                            _updateColorsProperty('hsla', 's', percent / 100);
                            break;
                        case "lightness":
                            _updateColorsProperty('hsla', 'l', percent / 100);
                            break;
                        case "opacity":
                            _updateColorsProperty('hsla', 'a', percent / 100);
                            break;
                        case "red":
                            _updateColorsProperty('rgba', 'r', 2.55 * percent);
                            break;
                        case "green":
                            _updateColorsProperty('rgba', 'g', 2.55 * percent);
                            break;
                        case "blue":
                            _updateColorsProperty('rgba', 'b', 2.55 * percent);
                            break;
                    }

                    _updateAllElements();

                    ev.preventDefault();
                });

                $(document).on("touchend mouseup", function(ev) {
                    if (ev.which > 1) {
                        return;
                    }

                    if (dragTarget) {
                        dragTarget = false;
                        ev.preventDefault();
                    }
                });

                if (!settings.flat) {
                    popover_container.on("touchstart mousedown", ".popover", function(ev) {
                        ev.preventDefault();
                        ev.stopPropagation();

                        return false;
                    });
                }
            }

            function _parseCustomSwatches() {
                swatches = [];

                for (var i = 0; i < settings.swatches.length; i++) {
                    var color = tinycolor(settings.swatches[i]);

                    if (color.format) {
                        swatches.push(color.toRgbString());
                    }
                }
            }

            function _renderSwatches() {
                if (!settings.swatches) {
                    return;
                }

                if (settings.customswatches) {
                    var customswatches = false;

                    try {
                        customswatches = JSON.parse(localStorage.getItem("swatches-" + settings.customswatches));
                    }
                    catch (err) {
                    }

                    if (customswatches) {
                        swatches = customswatches;
                    }
                    else {
                        _parseCustomSwatches();
                    }
                }
                else {
                    _parseCustomSwatches();
                }

                if (swatches instanceof Array) {
                    elements.swatches.html("");
                    for (var i = 0; i < swatches.length; i++) {
                        var color = tinycolor(swatches[i]);

                        if (color.format) {
                            var span = $('<span></span>').css("background-color", color.toRgbString());
                            var button = $('<div class="btn btn-default cp-swatch"></div>');

                            button.append(span);

                            elements.swatches.append($("<li></li>").append(button));
                        }
                    }
                }

                _findActualColorsSwatch();
            }

            function _findActualColorsSwatch() {
                var found = false;

                $("span", elements.swatches).filter(function() {
                    var swatchcolor = $(this).css('background-color');

                    swatchcolor = tinycolor(swatchcolor);
                    swatchcolor.alpha = Math.round(swatchcolor.alpha * 100) / 100;

                    if (swatchcolor.toRgbString() === color.tiny.toRgbString()) {
                        found = true;

                        var currentswatch = $(this).parent();

                        if (!currentswatch.is(elements.actualswatch)) {
                            if (elements.actualswatch) {
                                elements.actualswatch.removeClass("actual");
                            }
                            elements.actualswatch = currentswatch;
                            currentswatch.addClass("actual");
                        }
                    }
                });

                if (!found) {
                    if (elements.actualswatch) {
                        elements.actualswatch.removeClass("actual");
                        elements.actualswatch = false;
                    }
                }

                if (elements.actualswatch) {
                    elements.swatches_add.prop("disabled", true);
                    elements.swatches_remove.prop("disabled", false);
                }
                else {
                    elements.swatches_add.prop("disabled", false);
                    elements.swatches_remove.prop("disabled", true);
                }
            }

            function _storeSwatches() {
                localStorage.setItem("swatches-" + settings.customswatches, JSON.stringify(swatches));
            }

            function _addCurrentColorToSwatches() {
                swatches.unshift(color.tiny.toRgbString());
                _storeSwatches();

                $(document).trigger("colorpickersliders.changeswatches");
            }

            function _removeActualColorFromSwatches() {
                var index = swatches.indexOf(color.tiny.toRgbString());

                if (index !== -1) {
                    swatches.splice(index, 1);

                    _storeSwatches();
                    $(document).trigger("colorpickersliders.changeswatches");
                }
            }

            function _resetSwatches() {
                if (confirm("Do you really want to reset the swatches? All customizations will be lost!")) {
                    _parseCustomSwatches();

                    _storeSwatches();

                    $(document).trigger("colorpickersliders.changeswatches");
                }
            }

            function _updateColorsProperty(format, property, value) {
                switch (format) {
                    case 'hsla':

                        color.hsla[property] = value;
                        color.tiny = tinycolor({h: color.hsla.h, s: color.hsla.s, l: color.hsla.l, a: color.hsla.a});
                        color.rgba = color.tiny.toRgb();

                        container.removeClass("cp-unconvertible-cie-color");

                        break;

                    case 'rgba':

                        color.rgba[property] = value;
                        color.tiny = tinycolor({r: color.rgba.r, g: color.rgba.g, b: color.rgba.b, a: color.hsla.a});
                        color.hsla = color.tiny.toHsl();

                        container.removeClass("cp-unconvertible-cie-color");

                        break;

                }
            }

            function _updateMarkerPosition(slidername, ev) {
                var percent = $.fn.ColorPickerSliders.calculateEventPositionPercentage(ev, elements.sliders[slidername]);

                elements.sliders[slidername + '_marker'].data("position", percent);

                return percent;
            }

            var updateAllElementsTimeout;

            function _updateAllElementsTimer(disableinputupdate) {
                updateAllElementsTimeout = setTimeout(function() {
                    _updateAllElements(disableinputupdate);
                }, settings.updateinterval);
            }

            function _updateAllElements(disableinputupdate) {
                clearTimeout(updateAllElementsTimeout);

                Date.now = Date.now || function() { return +new Date; };

                if (Date.now() - lastUpdateTime < settings.updateinterval) {
                    _updateAllElementsTimer(disableinputupdate);
                    return;
                }

                if (typeof disableinputupdate === "undefined") {
                    disableinputupdate = false;
                }

                lastUpdateTime = Date.now();

                if (settings.order.opacity !== false) {
                    _renderOpacity();
                }

                if (settings.order.hsl !== false) {
                    _renderHue();
                    _renderSaturation();
                    _renderLightness();
                }

                if (settings.order.rgb !== false) {
                    _renderRed();
                    _renderGreen();
                    _renderBlue();
                }

                if (settings.order.preview !== false) {
                    _renderPreview();
                }

                if (!disableinputupdate) {
                    _updateConnectedInput();
                }

                if ((100 - color.hsla.l * 100) * color.hsla.a < settings.previewcontrasttreshold) {
                    elements.all_sliders.css('color', '#000');
                }
                else {
                    elements.all_sliders.css('color', '#fff');
                }

                _updateTriggerelementColor();
                _findActualColorsSwatch();

                settings.onchange(container, color);

                triggerelement.data("color", color);
            }

            function _updateTriggerelementColor() {
                if (triggerelementisinput && settings.previewontriggerelement) {
                    if ((100 - color.hsla.l * 100) * color.hsla.a < settings.previewcontrasttreshold) {
                        triggerelement.css('background', color.tiny.toRgbString()).css('color', '#000');
                    }
                    else {
                        triggerelement.css('background', color.tiny.toRgbString()).css('color', '#fff');
                    }
                }
            }

            function _updateConnectedInput() {
                if (connectedinput) {
                    connectedinput.each(function(index, element) {
                        var $element = $(element),
                            format = $element.data('color-format') || settings.previewformat;

                        switch (format) {
                            case 'hex':
                                $element.val(color.tiny.toHexString());
                                break;
                            case 'hsl':
                                $element.val(color.tiny.toHslString());
                                break;
                            case 'rgb':
                                /* falls through */
                            default:
                                $element.val(color.tiny.toRgbString());
                                break;
                        }
                    });
                }
            }

            function _renderHue() {
                setGradient(elements.sliders.hue, $.fn.ColorPickerSliders.getScaledGradientStops(color.hsla, "h", 0, 360, 7));

                elements.sliders.hue_marker.css("left", color.hsla.h / 360 * 100 + "%");
            }

            function _renderSaturation() {
                setGradient(elements.sliders.saturation, $.fn.ColorPickerSliders.getScaledGradientStops(color.hsla, "s", 0, 1, 2));

                elements.sliders.saturation_marker.css("left", color.hsla.s * 100 + "%");
            }

            function _renderLightness() {
                setGradient(elements.sliders.lightness, $.fn.ColorPickerSliders.getScaledGradientStops(color.hsla, "l", 0, 1, 3));

                elements.sliders.lightness_marker.css("left", color.hsla.l * 100 + "%");
            }

            function _renderOpacity() {
                setGradient(elements.sliders.opacity, $.fn.ColorPickerSliders.getScaledGradientStops(color.hsla, "a", 0, 1, 2));

                elements.sliders.opacity_marker.css("left", color.hsla.a * 100 + "%");
            }

            function _renderRed() {
                setGradient(elements.sliders.red, $.fn.ColorPickerSliders.getScaledGradientStops(color.rgba, "r", 0, 255, 2));

                elements.sliders.red_marker.css("left", color.rgba.r / 255 * 100 + "%");
            }

            function _renderGreen() {
                setGradient(elements.sliders.green, $.fn.ColorPickerSliders.getScaledGradientStops(color.rgba, "g", 0, 255, 2));

                elements.sliders.green_marker.css("left", color.rgba.g / 255 * 100 + "%");
            }

            function _renderBlue() {
                setGradient(elements.sliders.blue, $.fn.ColorPickerSliders.getScaledGradientStops(color.rgba, "b", 0, 255, 2));

                elements.sliders.blue_marker.css("left", color.rgba.b / 255 * 100 + "%");
            }

            function _renderPreview() {
                elements.sliders.preview.css("background", $.fn.ColorPickerSliders.csscolor(color.rgba));

                var colorstring;

                switch (settings.previewformat) {
                    case 'hex':
                        colorstring = color.tiny.toHexString();
                        break;
                    case 'hsl':
                        colorstring = color.tiny.toHslString();
                        break;
                    case 'rgb':
                        /* falls through */
                    default:
                        colorstring = color.tiny.toRgbString();
                        break;
                }

                elements.sliders.preview.val(colorstring);
            }

            function setGradient(element, gradientstops) {
                gradientstops.sort(function(a, b) {
                    return a.position - b.position;
                });

                switch(rendermode) {
                    case "noprefix":
                        $.fn.ColorPickerSliders.renderNoprefix(element, gradientstops);
                        break;
                    case "webkit":
                        $.fn.ColorPickerSliders.renderWebkit(element, gradientstops);
                        break;
                    case "ms":
                        $.fn.ColorPickerSliders.renderMs(element, gradientstops);
                        break;
                    case "svg": // can not repeat, radial can be only a covering ellipse (maybe there is a workaround, need more investigation)
                        $.fn.ColorPickerSliders.renderSVG(element, gradientstops);
                        break;
                    case "oldwebkit":   // can not repeat, no percent size with radial gradient (and no ellipse)
                        $.fn.ColorPickerSliders.renderOldwebkit(element, gradientstops);
                        break;
                }
            };

        });

    };

    $.fn.ColorPickerSliders.getEventCoordinates = function(ev) {
        if (typeof ev.pageX !== "undefined") {
            return {
                pageX: ev.originalEvent.pageX,
                pageY: ev.originalEvent.pageY
            };
        }
        else if (typeof ev.originalEvent.touches !== "undefined") {
            return {
                pageX: ev.originalEvent.touches[0].pageX,
                pageY: ev.originalEvent.touches[0].pageY
            };
        }
    };

    $.fn.ColorPickerSliders.calculateEventPositionPercentage = function(ev, containerElement) {
        var c = $.fn.ColorPickerSliders.getEventCoordinates(ev);

        var xsize = containerElement.width(),
                offsetX = c.pageX - containerElement.offset().left;

        var percent = offsetX / xsize * 100;

        if (percent < 0) {
            percent = 0;
        }

        if (percent > 100) {
            percent = 100;
        }

        return percent;
    };

    $.fn.ColorPickerSliders.getScaledGradientStops = function(color, scalableproperty, minvalue, maxvalue, steps, invalidcolorsopacity, minposition, maxposition) {
        if (typeof invalidcolorsopacity === "undefined") {
            invalidcolorsopacity = 1;
        }

        if (typeof minposition === "undefined") {
            minposition = 0;
        }

        if (typeof maxposition === "undefined") {
            maxposition = 100;
        }

        var gradientStops = [],
                diff = maxvalue - minvalue,
                isok = true;

        for (var i = 0; i < steps; ++i) {
            var currentstage = i / (steps - 1),
                    modifiedcolor = $.fn.ColorPickerSliders.modifyColor(color, scalableproperty, currentstage * diff + minvalue),
                    csscolor;

            if (invalidcolorsopacity < 1) {
                var stagergb = $.fn.ColorPickerSliders.lch2rgb(modifiedcolor, invalidcolorsopacity);

                isok = stagergb.isok;
                csscolor = $.fn.ColorPickerSliders.csscolor(stagergb, invalidcolorsopacity);
            }
            else {
                csscolor = $.fn.ColorPickerSliders.csscolor(modifiedcolor, invalidcolorsopacity);
            }

            gradientStops[i] = {
                color: csscolor,
                position: currentstage * (maxposition - minposition) + minposition,
                isok: isok,
                rawcolor: modifiedcolor
            };
        }

        return gradientStops;
    };

    $.fn.ColorPickerSliders.getGradientStopsCSSString = function(gradientstops) {
        var gradientstring = "",
            oldwebkit = "",
            svgstoppoints = "";

        for (var i = 0; i < gradientstops.length; i++) {
            var el = gradientstops[i];

            gradientstring += "," + el.color + " " + el.position + "%";
            oldwebkit += ",color-stop(" + el.position + "%," + el.color + ")";

            var svgcolor = tinycolor(el.color);

            svgstoppoints += '<stop ' + 'stop-color="' + svgcolor.toHexString() + '" stop-opacity="' + svgcolor.toRgb().a + '"' + ' offset="' + el.position/100 + '"/>';
        }

        return {
            noprefix: gradientstring,
            oldwebkit: oldwebkit,
            svg: svgstoppoints
        };
    };

    $.fn.ColorPickerSliders.renderNoprefix = function(element, gradientstops) {
        var css = "linear-gradient(to right",
            stoppoints = $.fn.ColorPickerSliders.getGradientStopsCSSString(gradientstops).noprefix;

        css += stoppoints + ")";

        element.css("background-image", css);
    };

    $.fn.ColorPickerSliders.renderWebkit = function(element, gradientstops) {
        var css = "-webkit-linear-gradient(left",
            stoppoints = $.fn.ColorPickerSliders.getGradientStopsCSSString(gradientstops).noprefix;

        css += stoppoints + ")";

        element.css("background-image", css);
    };

    $.fn.ColorPickerSliders.renderOldwebkit = function(element, gradientstops) {
        var css = "-webkit-gradient(linear, 0% 0%, 100% 0%",
            stoppoints = $.fn.ColorPickerSliders.getGradientStopsCSSString(gradientstops).oldwebkit;

        css += stoppoints + ")";

        element.css("background-image", css);
    };

    $.fn.ColorPickerSliders.renderMs = function(element, gradientstops) {
        var css = "-ms-linear-gradient(to right",
            stoppoints = $.fn.ColorPickerSliders.getGradientStopsCSSString(gradientstops).noprefix;

        css += stoppoints + ")";

        element.css("background-image", css);
    };

    $.fn.ColorPickerSliders.renderSVG = function(element, gradientstops) {
        var svg = "",
            svgstoppoints = $.fn.ColorPickerSliders.getGradientStopsCSSString(gradientstops).svg;

        svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none"><linearGradient id="vsgg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100%" y2="0">';
        svg += svgstoppoints;
        svg += '</linearGradient><rect x="0" y="0" width="1" height="1" fill="url(#vsgg)" /></svg>';
        svg = "url(data:image/svg+xml;base64," + $.fn.ColorPickerSliders.base64encode(svg) + ")";

        element.css("background-image", svg);
    };

    /* source: http://phpjs.org/functions/base64_encode/ */
    $.fn.ColorPickerSliders.base64encode = function(data) {
        var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
            ac = 0,
            enc = "",
            tmp_arr = [];

        if (!data) {
            return data;
        }

        do {
            o1 = data.charCodeAt(i++);
            o2 = data.charCodeAt(i++);
            o3 = data.charCodeAt(i++);

            bits = o1 << 16 | o2 << 8 | o3;

            h1 = bits >> 18 & 0x3f;
            h2 = bits >> 12 & 0x3f;
            h3 = bits >> 6 & 0x3f;
            h4 = bits & 0x3f;

            tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
        } while (i < data.length);

        enc = tmp_arr.join('');

        var r = data.length % 3;

        return (r ? enc.slice(0, r - 3) : enc) + '==='.slice(r || 3);
    };

    $.fn.ColorPickerSliders.modifyColor = function(color, property, value) {
        var modifiedcolor = $.extend({}, color);

        if (!color.hasOwnProperty(property)) {
            throw("Missing color property: " + property);
        }

        modifiedcolor[property] = value;

        return modifiedcolor;
    };

    $.fn.ColorPickerSliders.csscolor = function(color, invalidcolorsopacity) {
        if (typeof invalidcolorsopacity === "undefined") {
            invalidcolorsopacity = 1;
        }

        var $return = false,
                tmpcolor = $.extend({}, color);

        if (tmpcolor.hasOwnProperty('c')) {
            // CIE-LCh
            tmpcolor = $.fn.ColorPickerSliders.lch2rgb(tmpcolor, invalidcolorsopacity);
        }

        if (tmpcolor.hasOwnProperty('h')) {
            // HSL
            $return = "hsla(" + tmpcolor.h + "," + tmpcolor.s * 100 + "%," + tmpcolor.l * 100 + "%," + tmpcolor.a + ")";
        }

        if (tmpcolor.hasOwnProperty('r')) {
            // RGB
            if (tmpcolor.a < 1) {
                $return = "rgba(" + Math.round(tmpcolor.r) + "," + Math.round(tmpcolor.g) + "," + Math.round(tmpcolor.b) + "," + tmpcolor.a + ")";
            }
            else {
                $return = "rgb(" + Math.round(tmpcolor.r) + "," + Math.round(tmpcolor.g) + "," + Math.round(tmpcolor.b) + ")";
            }
        }

        return $return;
    };

    $.fn.ColorPickerSliders.detectWhichGradientIsSupported = function() {
        var testelement = document.createElement('detectGradientSupport').style;

        try {
            testelement.backgroundImage = "linear-gradient(to top left, #9f9, white)";
            if (testelement.backgroundImage.indexOf("gradient") !== -1) {
                return "noprefix";
            }

            testelement.backgroundImage = "-webkit-linear-gradient(left top, #9f9, white)";
            if (testelement.backgroundImage.indexOf("gradient") !== -1) {
                return "webkit";
            }

            testelement.backgroundImage = "-ms-linear-gradient(left top, #9f9, white)";
            if (testelement.backgroundImage.indexOf("gradient") !== -1) {
                return "ms";
            }

            testelement.backgroundImage = "-webkit-gradient(linear, left top, right bottom, from(#9f9), to(white))";
            if (testelement.backgroundImage.indexOf("gradient") !== -1) {
                return "oldwebkit";
            }
        }
        catch(err) {
            try {
                testelement.filter = "progid:DXImageTransform.Microsoft.gradient(startColorstr='#ffffff',endColorstr='#000000',GradientType=0)";
                if (testelement.filter.indexOf("DXImageTransform") !== -1) {
                    return "filter";
                }
            }
            catch(err) {}
        }

        return false;
    };

    $.fn.ColorPickerSliders.svgSupported = function() {
        return !! document.createElementNS && !! document.createElementNS('http://www.w3.org/2000/svg','svg').createSVGRect;
    };

})(jQuery);
