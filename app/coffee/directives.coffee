"use strict"

ngDocument = angular.element(document)
pixelize = (value)-> value + "px"
# Directives
angular.module("myApp.directives", [])
  .directive("appVersion", ["version", (version) ->
    (scope, elm, attrs) ->
      elm.text version
  ])
  .directive("pointer", ->

    restrict: 'E'
    template: '<div class="pointer-container"><div class="pointer-label">{{ value }}</div><div class="pointer"><div class="pointer-inner"></div></div></div>'
    replace: true
    scope:
      value: '='
    require: '^slider'
    link: (scope, element, attrs, controller)->
      updateDOM = ->
        pointer  = element.children()[1]
        pointerWidth = pointer.offsetWidth
        position = Math.max(controller.valueToPosition(scope.value) - pointerWidth, 0)
        element.css('left', pixelize(position))

        label = element.children()[0]
        labelWidth = label.offsetWidth
        labelOffset = -(labelWidth - pointerWidth)/2
        labelLeft = position + labelOffset
        labelRight = position + labelOffset + labelWidth
        normalizedLabelRight = controller.normalizePosition(labelRight)
        if labelLeft < 0
          labelOffset = -1 * position
        else if labelRight > normalizedLabelRight
          labelOffset = -1 * labelWidth + pointerWidth

        position + labelOffset
        angular.element(label).css('left', pixelize(labelOffset))

      updateDOM()
      scope.$on('barWidthChanged', updateDOM)
      scope.$watch('value', updateDOM)

      bind = (events)->
        onEnd = (e)->
          ngDocument.unbind events.move, onMove
          ngDocument.unbind events.end, onEnd
          scope.$emit('pointerMoveEnd')

        onMove = (e)->
          x = e.clientX ? e.touches[0].clientX
          offset = x - (element[0].getBoundingClientRect().left)
          scope.$apply ->
            scope.value = controller.positionToValue(controller.valueToPosition(scope.value) + offset)

        onStart = (e) ->
          e.stopPropagation()
          e.preventDefault()
          ngDocument.bind events.move, onMove
          ngDocument.bind events.end, onEnd

        element.bind events.start, onStart

      bind(start: 'mousedown', move: 'mousemove', end: 'mouseup')
      bind(start: 'touchstart', move: 'touchmove', end: 'touchend')
  )
  .directive("range", ()->
    restrict: 'E'
    template: '''<div><div class="selection"></div><pointer value="value.low"></pointer><pointer value="value.high"></pointer></div>'''
    replace: true
    scope:
      value: '='
    require: '^slider'
    link: (scope, element, attrs, controller)->
      scope.$on('pointerMoveEnd', ->
        scope.$apply ->
          if parseFloat(scope.value.low) > parseFloat(scope.value.high)
            [scope.value.high, scope.value.low] = [scope.value.low, scope.value.high]
      )
      updateDOM = ->
        selection = angular.element(element.children()[0])
        selection.css('left', pixelize(Math.max(controller.valueToPosition(Math.min(scope.value.low, scope.value.high)), 0)))
        selection.css('width',  pixelize(Math.max(controller.valueToPosition(Math.abs(scope.value.high - scope.value.low)), 0)))

      updateDOM()
      scope.$on('barWidthChanged', updateDOM)
      scope.$watch('value.low', updateDOM)
      scope.$watch('value.high', updateDOM)

      bind = (events)->
        startX = null
        onEnd = (e)->
          ngDocument.unbind events.move, onMove
          ngDocument.unbind events.end, onEnd

        onMove = (e)->
          x = e.clientX ? e.touches[0].clientX
          offset = x - startX
          startX = e.clientX ? e.touches[0].clientX
          width = scope.value.high - scope.value.low
          scope.$apply ->
            if offset < 0
              scope.value.low = controller.positionToValue(controller.valueToPosition(scope.value.low) + offset)
              scope.value.high = controller.positionToValue(controller.valueToPosition(scope.value.low + width))
            else
              scope.value.high = controller.positionToValue(controller.valueToPosition(scope.value.high) + offset)
              scope.value.low = controller.positionToValue(controller.valueToPosition(scope.value.high - width))

        onStart = (e) ->
          startX = e.clientX ? e.touches[0].clientX
          e.stopPropagation()
          e.preventDefault()
          ngDocument.bind events.move, onMove
          ngDocument.bind events.end, onEnd

        element.bind events.start, onStart

      bind(start: 'mousedown', move: 'mousemove', end: 'mouseup')
      bind(start: 'touchstart', move: 'touchmove', end: 'touchend')
  )
  .directive("slider", ($timeout)->
    restrict: 'E'
    template: '''
        <div class="slider" ng-switch on="mode">
            <div class="bar"></div>
            <div ng-switch-when="range">
                <range value="value"></range>
            </div>
            <div ng-switch-when="multi-range">
              <div ng-repeat="range in value">
                <range value="range"></range>
              </div>
            </div>
            <pointer value="value" ng-switch-default></pointer>
        </div>
    '''
    replace: true
    scope:
      minValue: '@'
      maxValue: '@'
      precision: '@'
      step: '@'
      mode: '@'
      value: '='
    controller: ($scope)->
      @normalizePosition = (position)->
        Math.max(Math.min(position, $scope.barWidth), 0)

      @normalizeValue = (value)->
        [minValue, precision, step] =
          (parseFloat($scope[name] || 0) for name in ['minValue', 'precision', 'step'])
        step ||= 1/Math.pow(10, precision)

        remainder = (value - minValue) % step
        stepped = if remainder > (step / 2) then value + (step - remainder) else value - remainder
        decimals = Math.pow(10, precision)
        Math.min(Math.max(((stepped * decimals) / decimals).toFixed(precision), $scope.minValue), $scope.maxValue)

      @valueToPosition = (value)->
        [minValue, maxValue, barWidth] = (parseFloat($scope[name] || 0) for name in ['minValue', 'maxValue', 'barWidth'])
        (barWidth * (parseFloat(value)))/(maxValue - minValue)

      @positionToValue = (position)->
        [minValue, maxValue, barWidth] = (parseFloat($scope[name] || 0) for name in ['minValue', 'maxValue', 'barWidth'])
        @normalizeValue(minValue + ((position/barWidth)*(maxValue-minValue)))

    link: (scope, element, attrs, controller)->
      updateScope = ->
        $timeout ->
          scope.barWidth = element[0].offsetWidth
          scope.$broadcast('barWidthChanged')
      updateScope()
      window.addEventListener 'resize', updateScope

      scope.$on('addRange', (e, range)->
        if scope.mode == 'multi-range'
          scope.value.push(range)
      )
  )
