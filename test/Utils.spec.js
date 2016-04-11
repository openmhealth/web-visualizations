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

describe( "Utils", function () {

    describe( "Merge Objects", function () {

        beforeEach( function () {
            this.lib = OMHWebVisualizations;
        } );

        afterEach( function () {
            var merged = this.lib.Utils.mergeObjects( this.o1, this.o2 );
            expect( merged ).toEqual( this.o3 );
        } );

        it( "overrides a property in the the first argument with one in the second", function () {
            this.o1 = {
                value: 1
            };
            this.o2 = {
                value: 2
            };
            this.o3 = {
                value: 2
            };
        } );

        it( "preserves any properties that are not present in both arguments", function () {
            this.o1 = {
                argOneValue: 1
            };
            this.o2 = {
                argTwoValue: 2
            };
            this.o3 = {
                argOneValue: 1,
                argTwoValue: 2
            };
        } );

        it( "overrides a nested property in the the first argument with one in the second", function () {
            this.o1 = {
                object: {
                    value: 1
                }
            };
            this.o2 = {
                object: {
                    value: 2
                }
            };
            this.o3 = {
                object: {
                    value: 2
                }
            };
        } );

        it( "overrides a property defined in the the first argument with an explicitly undefined property of the same name in the second", function () {
            this.o1 = {
                value: 1
            };
            this.o2 = {
                value: undefined
            };
            this.o3 = {
                value: undefined
            };
        } );

    } );

} );