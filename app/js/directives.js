(function() {
  "use strict";  var ngDocument, pixelize;
  ngDocument = angular.element(document);
  pixelize = function(value) {
    return value + "px";
  };
  angular.module("myApp.directives", []).directive("appVersion", [
    "version", function(version) {
      return function(scope, elm, attrs) {
        return elm.text(version);
      };
    }
  ]).directive("pointer", function() {
    return {
      restrict: 'E',
      template: '<div class="pointer-container"><div class="pointer-label">{{ value }}</div><div class="pointer"><div class="pointer-inner"></div></div></div>',
      replace: true,
      scope: {
        value: '='
      },
      require: '^slider',
      link: function(scope, element, attrs, controller) {
        var bind, updateDOM;
        updateDOM = function() {
          var label, labelLeft, labelOffset, labelRight, labelWidth, normalizedLabelRight, pointer, pointerWidth, position;
          pointer = element.children()[1];
          pointerWidth = pointer.offsetWidth;
          position = Math.max(controller.valueToPosition(scope.value) - pointerWidth, 0);
          element.css('left', pixelize(position));
          label = element.children()[0];
          labelWidth = label.offsetWidth;
          labelOffset = -(labelWidth - pointerWidth) / 2;
          labelLeft = position + labelOffset;
          labelRight = position + labelOffset + labelWidth;
          normalizedLabelRight = controller.normalizePosition(labelRight);
          if (labelLeft < 0) {
            labelOffset = -1 * position;
          } else if (labelRight > normalizedLabelRight) {
            labelOffset = -1 * labelWidth + pointerWidth;
          }
          position + labelOffset;
          return angular.element(label).css('left', pixelize(labelOffset));
        };
        updateDOM();
        scope.$on('barWidthChanged', updateDOM);
        scope.$watch('value', updateDOM);
        bind = function(events) {
          var onEnd, onMove, onStart;
          onEnd = function(e) {
            ngDocument.unbind(events.move, onMove);
            ngDocument.unbind(events.end, onEnd);
            return scope.$emit('pointerMoveEnd');
          };
          onMove = function(e) {
            var offset, x, _ref;
            x = (_ref = e.clientX) != null ? _ref : e.touches[0].clientX;
            offset = x - (element[0].getBoundingClientRect().left);
            return scope.$apply(function() {
              return scope.value = controller.positionToValue(controller.valueToPosition(scope.value) + offset);
            });
          };
          onStart = function(e) {
            e.stopPropagation();
            e.preventDefault();
            ngDocument.bind(events.move, onMove);
            return ngDocument.bind(events.end, onEnd);
          };
          return element.bind(events.start, onStart);
        };
        bind({
          start: 'mousedown',
          move: 'mousemove',
          end: 'mouseup'
        });
        return bind({
          start: 'touchstart',
          move: 'touchmove',
          end: 'touchend'
        });
      }
    };
  }).directive("range", function() {
    return {
      restrict: 'E',
      template: '<div><div class="selection"></div><pointer value="value.low"></pointer><pointer value="value.high"></pointer></div>',
      replace: true,
      scope: {
        value: '='
      },
      require: '^slider',
      link: function(scope, element, attrs, controller) {
        var bind, updateDOM;
        scope.$on('pointerMoveEnd', function() {
          return scope.$apply(function() {
            var _ref;
            if (parseFloat(scope.value.low) > parseFloat(scope.value.high)) {
              return _ref = [scope.value.low, scope.value.high], scope.value.high = _ref[0], scope.value.low = _ref[1], _ref;
            }
          });
        });
        updateDOM = function() {
          var selection;
          selection = angular.element(element.children()[0]);
          selection.css('left', pixelize(Math.max(controller.valueToPosition(Math.min(scope.value.low, scope.value.high)), 0)));
          return selection.css('width', pixelize(Math.max(controller.valueToPosition(Math.abs(scope.value.high - scope.value.low)), 0)));
        };
        updateDOM();
        scope.$on('barWidthChanged', updateDOM);
        scope.$watch('value.low', updateDOM);
        scope.$watch('value.high', updateDOM);
        bind = function(events) {
          var onEnd, onMove, onStart, startX;
          startX = null;
          onEnd = function(e) {
            ngDocument.unbind(events.move, onMove);
            return ngDocument.unbind(events.end, onEnd);
          };
          onMove = function(e) {
            var offset, width, x, _ref, _ref2;
            x = (_ref = e.clientX) != null ? _ref : e.touches[0].clientX;
            offset = x - startX;
            startX = (_ref2 = e.clientX) != null ? _ref2 : e.touches[0].clientX;
            width = scope.value.high - scope.value.low;
            return scope.$apply(function() {
              if (offset < 0) {
                scope.value.low = controller.positionToValue(controller.valueToPosition(scope.value.low) + offset);
                return scope.value.high = controller.positionToValue(controller.valueToPosition(scope.value.low + width));
              } else {
                scope.value.high = controller.positionToValue(controller.valueToPosition(scope.value.high) + offset);
                return scope.value.low = controller.positionToValue(controller.valueToPosition(scope.value.high - width));
              }
            });
          };
          onStart = function(e) {
            var _ref;
            startX = (_ref = e.clientX) != null ? _ref : e.touches[0].clientX;
            e.stopPropagation();
            e.preventDefault();
            ngDocument.bind(events.move, onMove);
            return ngDocument.bind(events.end, onEnd);
          };
          return element.bind(events.start, onStart);
        };
        bind({
          start: 'mousedown',
          move: 'mousemove',
          end: 'mouseup'
        });
        return bind({
          start: 'touchstart',
          move: 'touchmove',
          end: 'touchend'
        });
      }
    };
  }).directive("slider", function($timeout) {
    return {
      restrict: 'E',
      template: '<div class="slider" ng-switch on="mode">\n    <div class="bar"></div>\n    <div ng-switch-when="range">\n        <range value="value"></range>\n    </div>\n    <div ng-switch-when="multi-range">\n      <div ng-repeat="range in value">\n        <range value="range"></range>\n      </div>\n    </div>\n    <pointer value="value" ng-switch-default></pointer>\n</div>',
      replace: true,
      scope: {
        minValue: '@',
        maxValue: '@',
        precision: '@',
        step: '@',
        mode: '@',
        value: '='
      },
      controller: function($scope) {
        this.normalizePosition = function(position) {
          return Math.max(Math.min(position, $scope.barWidth), 0);
        };
        this.normalizeValue = function(value) {
          var decimals, minValue, name, precision, remainder, step, stepped, _ref;
          _ref = (function() {
            var _i, _len, _ref, _results;
            _ref = ['minValue', 'precision', 'step'];
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              name = _ref[_i];
              _results.push(parseFloat($scope[name] || 0));
            }
            return _results;
          })(), minValue = _ref[0], precision = _ref[1], step = _ref[2];
          step || (step = 1 / Math.pow(10, precision));
          remainder = (value - minValue) % step;
          stepped = remainder > (step / 2) ? value + (step - remainder) : value - remainder;
          decimals = Math.pow(10, precision);
          return Math.min(Math.max(((stepped * decimals) / decimals).toFixed(precision), $scope.minValue), $scope.maxValue);
        };
        this.valueToPosition = function(value) {
          var barWidth, maxValue, minValue, name, _ref;
          _ref = (function() {
            var _i, _len, _ref, _results;
            _ref = ['minValue', 'maxValue', 'barWidth'];
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              name = _ref[_i];
              _results.push(parseFloat($scope[name] || 0));
            }
            return _results;
          })(), minValue = _ref[0], maxValue = _ref[1], barWidth = _ref[2];
          return (barWidth * (parseFloat(value))) / (maxValue - minValue);
        };
        return this.positionToValue = function(position) {
          var barWidth, maxValue, minValue, name, _ref;
          _ref = (function() {
            var _i, _len, _ref, _results;
            _ref = ['minValue', 'maxValue', 'barWidth'];
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              name = _ref[_i];
              _results.push(parseFloat($scope[name] || 0));
            }
            return _results;
          })(), minValue = _ref[0], maxValue = _ref[1], barWidth = _ref[2];
          return this.normalizeValue(minValue + ((position / barWidth) * (maxValue - minValue)));
        };
      },
      link: function(scope, element, attrs, controller) {
        var updateScope;
        updateScope = function() {
          return $timeout(function() {
            scope.barWidth = element[0].offsetWidth;
            return scope.$broadcast('barWidthChanged');
          });
        };
        updateScope();
        window.addEventListener('resize', updateScope);
        return scope.$on('addRange', function(e, range) {
          if (scope.mode === 'multi-range') {
            return scope.value.push(range);
          }
        });
      }
    };
  });
}).call(this);
