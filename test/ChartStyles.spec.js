/***
 * Copyright 2016 Open mHealth
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

describe( "ChartStyles", function () {

    beforeEach( function () {

        this.lib = OMHWebVisualizations;
        this.configuration = new this.lib.ChartConfiguration( {} );

        this.styles = new this.lib.ChartStyles( this.configuration );

    } );


    describe( "Filters", function () {

        beforeAll( function () {

        } );

        it( "filters a datum based on measure", function () {

            for ( var measure in this.measureResults ) {

                var d = {
                    y: 100,
                    measure: measure
                };

                var measureMatches = ChartStyles.filters.measure( measure )( d );
                expect( measureMatches ).toEqual( true );

                measureMatches = ChartStyles.filters.measure( measure + Math.random() )( d );
                expect( measureMatches ).toEqual( false );

            }

        } );

        it( "matches data based on a list of filters", function () {

            var data = {
                pass: {
                    y: 100,
                    measure: 'pass_measure'
                },
                failY: {
                    y: 101,
                    measure: 'pass_measure'
                },
                failMeasure: {
                    y: 100,
                    measure: 'fail_measure'
                }
            };

            var filters = [
                function ( d ) {
                    return d.y === 100;
                },
                function ( d ) {
                    return d.measure === 'pass_measure';
                }
            ];

            var filterFunction = this.styles.applyFilters;
            expect( filterFunction( filters, data.pass ) ).toEqual( true );
            expect( filterFunction( filters, data.failMeasure ) ).toEqual( false );
            expect( filterFunction( filters, data.failY ) ).toEqual( false );


        } );

    } );


    describe( "Accessors", function () {

        beforeEach( function () {

            var testValue = 100;

            var matchNone = function ( d ) {
                return false;
            };
            var matchAbove = function ( d ) {
                return d.y > testValue;
            };
            var matchBelow = function ( d ) {
                return d.y < testValue;
            };

            this.styleDeclarations = [
                {
                    name: 'matchAny',
                    attributes: {
                        matchAny: 'matchAny'
                    }
                },
                {
                    name: 'matchNone',
                    filters: [ matchNone ],
                    attributes: {
                        matchNone: 'matchNone'
                    }
                },
                {
                    name: 'matchAbove',
                    filters: [ matchAbove ],
                    attributes: {
                        matchAbove: 'matchAbove'
                    }
                },
                {
                    name: 'matchBelow',
                    filters: [ matchBelow ],
                    attributes: {
                        matchBelow: 'matchBelow'
                    }
                }
            ];

            this.stylesKeyedByAttributeName = {
                matchAny: [ {
                    value: 'matchAny'
                } ],
                matchNone: [ {
                    filters: [ matchNone ],
                    value: 'matchNone'
                } ],
                matchAbove: [ {
                    filters: [ matchAbove ],
                    value: 'matchAbove'
                } ],
                matchBelow: [ {
                    filters: [ matchBelow ],
                    value: 'matchBelow'
                } ]
            };

            this.defaultAccessor = function ( d ) {
                return 'default';
            };

            this.getAccessor = function ( resultString ) {
                return this.styles.getAttributeValueAccessor( this.stylesKeyedByAttributeName[ resultString ], this.defaultAccessor );
            }

        } );

        it( "converts a list of style declarations into a map of attributes with filters, keyed by attribute name", function () {

            var map = this.styles.getStylesKeyedByAttributeName( this.styleDeclarations );
            expect( this.stylesKeyedByAttributeName ).toEqual( map );

        } );

        it( "provides an attribute value accessor for a datum that matches a filter in a style", function () {

            var data = {
                matchAbove: { y: 101 },
                matchBelow: { y: 99 },
                matchAny: { y: 100 }
            };

            var accessor;

            for ( var resultString in data ) {
                accessor = this.getAccessor( resultString );
                expect( accessor( data[ resultString ] ) ).toEqual( resultString );
            }


        } );

        it( "provides a default attribute value accessor for a datum that does not match any filters in a style", function () {

            var accessor;

            accessor = this.getAccessor( 'matchNone' );
            expect( accessor( { y: 0 } ) ).toEqual( 'default' );

        } );

    } );

} );
