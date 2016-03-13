( function( root, factory ) {

  var parentName = 'OMHWebVisualizations';
  root[ parentName ] = factory( root, parentName );

}( this, function( root, parentName ) {

  var parent = root.hasOwnProperty( parentName )? root[ parentName ] : {};

  parent.DataParser = function( data, element, measureList, options ){
  
  };

  return parent;

} ) );