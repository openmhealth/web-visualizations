
describe("Merge Objects", function() {

  beforeEach( function(){
    this.lib = OMHWebVisualizations;
  });

  afterEach( function(){
    var merged = this.lib.Utils.mergeObjects(this.o1,this.o2);
    expect(merged).toEqual(this.o3);
  });

  it("overrides a property in the the first argument with one in the second", function(){
    this.o1 = {
      value: 1
    };
    this.o2 = {
      value: 2
    };
    this.o3 = {
      value: 2
    };
  });

  it("preserves any properties that are not present in both arguments", function(){
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
  });

  it("overrides a nested property in the the first argument with one in the second", function(){
    this.o1 = {
      object:{
        value: 1
      }
    };
    this.o2 = {
      object:{
        value: 2
      }
    };
    this.o3 = {
      object:{
        value: 2
      }
    };
  });

  it("overrides a property defined in the the first argument with an explicitly undefined property of the same name in the second", function(){
    this.o1 = {
      value: 1
    };
    this.o2 = {
      value: undefined
    };
    this.o3 = {
      value: undefined
    };
  });

});