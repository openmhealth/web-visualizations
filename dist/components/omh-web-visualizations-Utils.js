( function ( root, factory ) {

    var parentName = 'OMHWebVisualizations';
    root[ parentName ] = factory( root, parentName );

}( this, function ( root, parentName ) {

    var parent = root.hasOwnProperty( parentName ) ? root[ parentName ] : {};

    var Utils;

    /**
     * No need to construct utils, because it is static. Placeholder for future use.
     * @constructor
     * @global
     * @classdesc
     * This glass is a home for very general static functions that support the library
     */
    Utils = function () {
    };

    /**
     * Deep, recursive merge of the properties of two objects.
     * @param {{}} obj1 - The base object
     * @param {{}} obj2 - The object with priority in the case of shared properties
     * @returns {{}}
     * @memberof Utils
     */
    Utils.mergeObjects = function ( obj1, obj2 ) {

        var merged = {};

        function set_attr( attr ) {
            if ( merged[ attr ] === undefined ) {
                var val1 = obj1[ attr ];
                var val2 = obj2[ attr ];
                // If both are objects, merge them. If not, or if the second value is an array, do not merge them
                if ( typeof(val1) === typeof(val2) && typeof(val1) === "object" && !( val2 instanceof Array ) ) {
                    merged[ attr ] = parent.Utils.mergeObjects( val1 || {}, val2 || {} );
                }
                else {
                    merged[ attr ] = val1;
                    if ( obj2.hasOwnProperty( attr ) ) {
                        merged[ attr ] = val2;
                    }
                }
            }
        }

        for ( var attrname in obj1 ) {
            set_attr( attrname );
        }

        for ( attrname in obj2 ) {
            set_attr( attrname );
        }

        return merged;

    };

    parent.Utils = Utils;

    return parent;

} ) );



