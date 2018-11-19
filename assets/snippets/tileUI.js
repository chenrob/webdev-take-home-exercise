/*
  reusing a tiling library I wrote back in 2012, with very minor
  modifications to support the Asana dog adoption page

  original source: https://github.com/chenrob/odl-tiles2.1

  specific changes:
  - OLD: init() only accepted overriding options if the HTML element
         had a data-tileui-options attribute

    NEW: init() also overrides options if it is called with an object

  - OLD: onResize() set tileWidth based on the tile's "width()"

    NEW: use outerWidth() instead

  - OLD: infiniteScroll() had logic related to being inside an iframe
         loaded inside facebook.com

    NEW: remove it

  - OLD: fetchNextTiles used POST and expected the ajax endpoint to
         return full html

    NEW: use GET, tell jQuery to parse ajax response as json, and
         invoke a callback function to build the display tiles
*/

(function ($) {
	var isLoading = false;
	var noMoreData = false;
	var heights = [];
	var columns = [];
	var pagesShown = 1;

	var options;
	var container;

	var $tiles = [];

	var methods = {
		init: function(opts) {
			container = this;

			var settings = container.data('tileuiOptions') || {};

			options = $.extend({
				columnGap: 15,
				maxPages: 1,
				minCols: 1
			}, opts || {}, settings);

			container.css({'position': 'relative', 'margin': '0 auto'});

			container.find('.tile').each(function() {
				$tiles.push($(this));
			});

			//on window resize, run handler to reposition the tiles
			$(window).bind('resize.tiles', methods.onResize);
			methods.onResize(); //trigger immediately to position tiles

			container.css('visibility', 'visible');

			if (options.infiniteScroll)
				methods.infiniteScroll();
		},
		onResize: function() {
			var tileElements = container.find('.tile');

			//how many columns can the window hold?
			var windowWidth = $(window).width();
			var tileWidth = tileElements.first().outerWidth();
			var numCols = Math.floor(windowWidth / (tileWidth + options.columnGap));
			numCols = Math.max(numCols, options.minCols); //ensure at least "minColumns" number of columns

			//if #cols change, reposition the tiles
			if (numCols != heights.length)
			{
				columns = [];
				heights = [];

				//temporarily remove tiles (will reattach later)
				//but get rid of the columns since we're going to create new ones
				tileElements.detach();
				container.find('.tile-column').remove();

				for (var i = 0; i < numCols; i++)
				{
					var css = {
						'position': 'absolute',
						'left': ((tileWidth + options.columnGap) * i) + 'px',
						'width': tileWidth + 'px'
					};

					heights[i] = 0;
					columns[i] = $('<div class="tile-column pull-left"></div>')
					             .css(css).appendTo(container);
				}

				//keep the container centered
				var width = numCols * (tileWidth + options.columnGap) - options.columnGap;
				container.css({'width': width + 'px'});

				//place tiles
				for (var k in $tiles)
					methods.place($tiles[k]);
			}
		},
		place: function($tile) {
			var placementIndex = methods.shortest();
			columns[placementIndex].append($tile);
			heights[placementIndex] += $tile.outerHeight(true);
		},
		shortest: function () {
			var shortest = 0;
			var minHeight = null;
			for (var i = 0; i < heights.length; i++)
				if (minHeight === null || heights[i] < minHeight)
				{
					minHeight = heights[i];
					shortest = i;
				}

			return shortest;
		},
		infiniteScroll: function() {
			var didScroll = false;

			$(window).scroll(function() {
				didScroll = true;
			});

			setInterval(function() {
				if (didScroll)
				{
					didScroll = false;

					var scrollThreshold;
					var scrollTop;

					// detect when the viewer gets close to the bottom of the page
					scrollThreshold = $(document).height() * 0.8;
					scrollTop = $(document).scrollTop();

					if (noMoreData) return false;
					if (pagesShown >= options.maxPages) return false;
					if (isLoading) return false;
					if (scrollTop + $(window).height() < scrollThreshold) return false;

					isLoading = true;
					pagesShown++;

					methods.fetchNextTiles();
				}
			}, 500);
		},
		fetchNextTiles: function() { // fetches and places
			var params = {nextPg: true};
			$.extend(params, options.nextParams);

			$.ajax({
				url: options.nextUrl,
				type: 'GET',
				data: params,
				dataType: 'json',
				success: function(response) {
					var displayTiles = options.buildTiles(response);
					var numTilesToPlace = 0;

					// place the tiles
					displayTiles.forEach(function(tileElement, index) {
						var $this = $(tileElement);

						$tiles.push($this);
						methods.place($this);
						numTilesToPlace ++;
					});

					if (numTilesToPlace == 0)
					{
						noMoreData = true;
					}

					isLoading = false;
				}
			});
		},
		setOption: function(k, v) { options[k] = v; }
	};

	$.fn.tileUI = function(method) {
		if (methods[method])
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		else if (typeof method === 'object' || !method)
			return methods.init.apply(this, arguments);
		else
			$.error('Method ' +  method + ' does not exist on jQuery.tooltip');
	};
})(jQuery);
