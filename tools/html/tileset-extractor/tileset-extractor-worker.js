self.onmessage = function ( event )
{
	var data = event.data;

	if( data.action == "extract" )
		extract( data.imageData, data.tileWidth, data.tileHeight, data.tolerance );
};

function sendStart()
{
	self.postMessage( {action: "extract-start"} );
}

function sendProgress( progress )
{
	self.postMessage( {
		action: "extract-progress",
		progress: progress
	} );
}

function sendResult( tiles, map, startTime )
{
	self.postMessage( {
				action: "extract-result",
				tiles: tiles,
				map: map,
				time: new Date().getTime() - startTime
			}
	);
}

function extract( imageData, tileWidth, tileHeight, tolerance )
{
	sendStart();

	var startTime = new Date().getTime();

	var sourceWidth = imageData.width;
	var sourceHeight = imageData.height;
	var sourceArray = imageData.data;

	function createTileFrom(sArray)
	{
		var tileData = new ImageData( tileWidth, tileHeight );
		var deltaX = tileX * tileWidth;
		var deltaY = tileY * tileHeight;
		var tileArray = tileData.data;
		var tileIndex = 0;

		for( var y = 0; y < tileHeight; ++y )
		{
			for( var x = 0; x < tileWidth; ++x )
			{
				var sourceIndex = ((deltaY + y) * sourceWidth + (deltaX + x)) << 2;

				for( var i = 0; i < 4; ++i )
					tileArray[tileIndex++] = sArray[sourceIndex++];
			}
		}
		return tileData;
	}

	function compareTileWith( tileX, tileY, tile )
	{
		var deltaX = tileX * tileWidth;
		var deltaY = tileY * tileHeight;

		var targetIndex = 0;
		var difference = 0;

		for( var y = 0; y < tileHeight; ++y )
		{
			for( var x = 0; x < tileWidth; ++x )
			{
				var sourceIndex = ((deltaY + y) * sourceWidth + (deltaX + x)) << 2;

				for( var i = 0; i < 4; ++i )
					difference += Math.abs( tile[targetIndex++] - sourceArray[sourceIndex++] );

				if( tolerance < difference )
					return false;
			}
		}
		return true;
	}

	var numCols = (sourceWidth / tileWidth) | 0;
	var numRows = (sourceHeight / tileHeight) | 0;
	var numTiles = numCols * numRows;
	var tiles = [];
	var map = [];
	var index;

	//Add a blank tile to appease GM2's tilesheet expectations.
	var idata = new Uint8ClampedArray(Math.pow(tileWidth, 4));
	for(var i = 0; i < idata.length; i+=4) {
		idata[i] = 0;
		idata[i+1] = 1;
		idata[i+2] = 2;
		idata[i+3] = 255;
	}
	var tt = createTileFrom(new ImageData(idata, tileWidth).data);
	tiles.push(tt);

	for( var tileIndex = 0; tileIndex < numTiles +1; ++tileIndex )
	{
		var tileX = (tileIndex % numCols) | 0;
		var tileY = (tileIndex / numCols) | 0;

		var tileExist = false;

		for( index = 0; index < tiles.length; ++index )
		{
			if( compareTileWith( tileX, tileY, tiles[index].data ) )
			{
				tileExist = true;
				break;
			}
		}
		if( !tileExist )
		{
			var tempTile = createTileFrom(sourceArray);
			tiles.push( tempTile );
		}

		map.push( index );

		if( tileIndex % 32 == 0 )
		{
			sendProgress( tileIndex / numTiles );
		}
	}
	sendResult( tiles, map, startTime );
}