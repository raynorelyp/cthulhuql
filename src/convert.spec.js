const convert = require('./convert');

describe('convert', ()=>{

    it('can select 1 column', ()=>{
        const query = "SELECT column2 FROM testdb";
        const data = {"testdb": [{column1:0,column2:1},{column1:2,column2:3}]};
        const expected = [{column2:1},{column2:3}];

        const actual = convert(query, data);

        expect(actual).toEqual(expected);
    });

    it('can select 1 column as', ()=>{
        const query = "SELECT column2 as hi FROM testdb";
        const data = {"testdb": [{column1:0,column2:1},{column1:2,column2:3}]};
        const expected = [{hi:1},{hi:3}];

        const actual = convert(query, data);

        expect(actual).toEqual(expected);
    });

    it('can select 2 columns', ()=>{
        const query = "SELECT column1, column2 FROM testdb";
        const data = {"testdb": [{column1:0,column2:1},{column1:2,column2:3}]};
        const expected = [{column1: 0, column2:1},{column1: 2, column2:3}];

        const actual = convert(query, data);

        expect(actual).toEqual(expected);
    });

    it('can select 2 columns as', ()=>{
        const query = "SELECT column1 as x, column2 as y FROM testdb";
        const data = {"testdb": [{column1:0,column2:1},{column1:2,column2:3}]};
        const expected = [{x: 0, y:1},{x: 2, y:3}];

        const actual = convert(query, data);

        expect(actual).toEqual(expected);
    });

    it('can select *', ()=>{
        const query = "SELECT * FROM testdb";
        const data = {"testdb": [{column1:0,column2:1},{column1:2,column2:3}]};
        const expected = [{column1: 0, column2:1},{column1: 2, column2:3}];

        const actual = convert(query, data);

        expect(actual).toEqual(expected);
    });

    it('can select jsonb', ()=>{
        const query = "SELECT x->'y'->>'z' FROM testdb";
        const data = {"testdb": [{x:{y:{z:'cool'}},column2:1},{x:{},column2:3}]};
        const expected = [{"x->'y'->>'z'": 'cool'},{"x->'y'->>'z'": undefined}];

        const actual = convert(query, data);

        expect(actual).toEqual(expected);
    });

    it('can filter using where AND', ()=>{
        const query = "SELECT * FROM testdb WHERE column1 > 0 AND column2 < 5";
        const data = {"testdb": [{column1:0,column2:1},{column1:2,column2:3}]};
        const expected = [{column1: 2, column2:3}];

        const actual = convert(query, data);

        expect(actual).toEqual(expected);
    });

    it('can filter using where OR', ()=>{
        const query = "SELECT * FROM testdb WHERE column1 > 0 OR column2 < 5";
        const data = {"testdb": [{column1:0,column2:1},{column1:2,column2:3}]};
        const expected = [{column1:0,column2:1},{column1: 2, column2:3}];

        const actual = convert(query, data);

        expect(actual).toEqual(expected);
    });

    it('can filter using where <>', ()=>{
        const query = "SELECT * FROM testdb WHERE column1 <> 0 ";
        const data = {"testdb": [{column1:0,column2:1},{column1:2,column2:3}]};
        const expected = [{column1: 2, column2:3}];

        const actual = convert(query, data);

        expect(actual).toEqual(expected);
    });

    it('can filter using where with strings', ()=>{
        const query = "SELECT * FROM testdb WHERE column1 <> '0' ";
        const data = {"testdb": [{column1:'0',column2:1},{column1:'2',column2:3}]};
        const expected = [{column1: '2', column2:3}];

        const actual = convert(query, data);

        expect(actual).toEqual(expected);
    });

    it('can filter using where with jsonb', ()=>{
        const query = "SELECT * FROM testdb WHERE column1->>'x' <> '0' ";
        const data = {"testdb": [{column1:{x:'0'},column2:1},{column1:{x:'2'},column2:3}]};
        const expected = [{column1: {x:'2'}, column2:3}];

        const actual = convert(query, data);

        expect(actual).toEqual(expected);
    });

    it('can order by a column', ()=>{
        const query = "SELECT * FROM testdb ORDER BY column2";
        const data = {"testdb": [{column1:{x:'0'},column2:3},{column1:1,column2:1},{column1:'col1',column2:2}]};
        const expected = [{column1:1,column2:1},{column1:'col1',column2:2},{column1:{x:'0'},column2:3}];

        const actual = convert(query, data);

        expect(actual).toEqual(expected);
    })

    it('can order by a json', ()=>{
        const query = "SELECT * FROM testdb ORDER BY column1->>'x'";
        const data = {"testdb": [{column1:{x:3},column2:3},{column1:{x:1},column2:1},{column1:{x:2},column2:2}]};
        const expected = [{column1:{x:1},column2:1},{column1:{x:2},column2:2},{column1:{x:3},column2:3}];

        const actual = convert(query, data);

        expect(actual).toEqual(expected);
    })
});