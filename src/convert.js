const select = (originalQuery, data) => {
    const symbolizeQueryString = (query, oldSymbols) => {
        const handleNewSymbol = (regexMatch) => {
            if(regexMatch && regexMatch[0]){
                const newSymbol = 'symbol'+Math.floor(Math.random() * 1000000000000);
                const oldSymbol = Object.keys(oldSymbols?.symbols || {}).reduce((prev,curr)=>oldSymbols?.symbols[curr] === regexMatch[0] ? curr : prev, '');
                const newQuery = query.replace(regexMatch[0], oldSymbol || newSymbol)
                const newSymbols = {query:newQuery, symbols: Object.assign(oldSymbols?.symbols || {}, {[newSymbol]:regexMatch[0]})}
                return symbolizeQueryString(newQuery, newSymbols);
            }
            return {
                symbols: oldSymbols?.symbols || {},
                query,
            }
        };
        const jsonB1 = /[a-zA-Z0-9]*->.*?'[a-zA-Z0-9]*'/.exec(query);
        const jsonB2 = /[a-zA-Z0-9]*->>.*?'[a-zA-Z0-9]*'/.exec(query);
        const asName = /[a-z0-9]* AS [a-z0-9]*/i.exec(query);

        return handleNewSymbol(jsonB1 || jsonB2 || asName);
    }

    const {query, symbols} = symbolizeQueryString(originalQuery);
    console.log('symbolized query string', query)
    console.log('symbols', symbols)

    const parseFieldString = (query) => {
        const indexOfSpace = query.indexOf(' ');
        const indexOfContinuation = /( *[><'\+\-=] *|NOT | AND | OR | AS )/gi.exec(query);
        const indexOfComma =  query.indexOf(',');

        if(indexOfSpace === -1)
            return query;

        if(indexOfContinuation && indexOfSpace >= indexOfContinuation.index)
            return query.substr(0, indexOfContinuation.index+indexOfContinuation[0].length) + parseFieldString(query.substr(indexOfContinuation.index+indexOfContinuation[0].length))

        if (indexOfComma !== -1 && indexOfComma < indexOfSpace) 
            return query.substr(0, indexOfComma+2) + parseFieldString(query.substr(indexOfComma+2));
            
        return query.substr(0, indexOfSpace+1);
    }

    const parseFields = (fieldsString) => fieldsString.split(', ').map(x=>x.trim()).map(x=>({fieldName:x.split(' ')[0], fieldAsName:x.split(' ')[x.split(' ').length-1]}));

    const selectFieldsString = parseFieldString(query.substr('select '.length));
    const selectString = query.substr(0,'select '.length) + selectFieldsString;
    const selectFields = parseFields(selectFieldsString);
    console.log('select string: ', selectString);
    console.log('select fields: ', selectFields);

    const fromFieldsString = parseFieldString(query.substr(selectString.length+'from '.length));
    const fromString = query.substr(selectString.length,'from '.length) + fromFieldsString;
    const fromFields = parseFields(fromFieldsString);
    console.log('from string: ', fromString);
    console.log('from fields: ', fromFields);

    const hasWhereClause = query.toLowerCase().substr(selectString.length+fromString.length,'where '.length) === 'where ';
    const whereFieldsString = hasWhereClause ? parseFieldString(query.substr(selectString.length+fromString.length+'where '.length)) : '';
    const whereString = hasWhereClause ? query.substr(selectString.length+fromString.length, 'where '.length)+ whereFieldsString : '';
    const whereResults = where(whereFieldsString, data[fromFields[0].fieldName], symbols);
    console.log('where string: ', whereString);
    console.log('where results: ', JSON.stringify(whereResults));

    const selectedResults = whereResults.map(result => selectFields.reduce((prev,curr)=> {
        if(curr.fieldName == '*') {
            prev = Object.assign(prev,result);
        } else {
            const column =  getRowColumn(result, curr.fieldAsName, symbols);
            prev[curr.fieldName] = column.value;
        }
        return prev;
    },{}));
    console.log('selected results: ', JSON.stringify(selectedResults));

    const hasOrderByClause = query.toLowerCase().substr(selectString.length+fromString.length+whereString.length,'order by '.length) === 'order by ';
    const orderByFieldsString = hasOrderByClause ? parseFieldString(query.substr(selectString.length+fromString.length+whereString.length+'order by '.length)) : '';
    const orderByString = hasOrderByClause ? query.substr(selectString.length+fromString.length+whereString.length, 'order by '.length)+ orderByFieldsString : '';
    const orderByResults = orderBy(orderByFieldsString, selectedResults, symbols)
    console.log('order by string', orderByString)
    console.log('order by results', orderByResults)

    const unsymbolizedResult = orderByResults.map(x=>Object.keys(x).reduce((prev,curr)=>Object.assign(prev, {[getRowColumn(x,curr,symbols).key]:x[curr]}),{}));
    console.log('result: ', unsymbolizedResult);
    return unsymbolizedResult;
};

const where = (query, table, symbols) => {
    if(!query) return table;

    var cleanQuery = query.trim().replace(/order by.*/i, '').replace(/group by.*/i, '');

    const jsonbMap = {};
    var jsonbCount=0;
    var hasJsonb =  /[a-zA-Z0-9]*->.*?'[a-zA-Z0-9]*'/.test(cleanQuery);
    while(hasJsonb){
        const newName = `j${jsonbCount}`;
        const jsonb = cleanQuery.match(/[a-zA-Z0-9]*->.*?'[a-zA-Z0-9]*'/).sort((a,b)=>a.length-b.length)[0];
        jsonbMap[jsonb] = newName;
        cleanQuery = cleanQuery.replace(jsonb,newName);
        hasJsonb =  /[a-zA-Z0-9]*->.*?'[a-zA-Z0-9]*'/.test(cleanQuery);
    }

    const jsQuery = cleanQuery.replace(/AND/g, '&&').replace(/OR/g,'||').replace(/=/g,'==').replace(/<>/,'!=');

    return table.filter(row => {
        const symbolsValiablesQuery = Object.keys(symbols).reduce((prev,curr)=>`const ${curr} = ${JSON.stringify(getRowColumn(row,curr,symbols).value)}; ${prev}`,'');
        const variablesQuery = Object.keys(row).reduce((prev,curr)=>`const ${curr} = ${JSON.stringify(getRowColumn(row,curr,symbols).value)}; ${prev}`,'');
        const evalString = '()=>{'+symbolsValiablesQuery+variablesQuery + 'return ' + jsQuery + ';};';
        console.log('eval string: ', evalString)
        const evalResult = eval(evalString)();
        return evalResult;
    });
};

const orderBy = (query, data, symbols) => {
    const sortables = query
        .split(', ')
        .map(x=>{
            const [field, order] = x.split(' ');
            return {field, order:order?.toLowerCase() == 'desc' ? -1 : 1}
        });
        
    const sortFunction = (a,b,sortables)=>{
        if(sortables.length === 0) return 1;
        const sortQuery = sortables[0];
        if(getRowColumn(a,sortQuery.field,symbols) === undefined) return 1;
        const aValue = getRowColumn(a,sortQuery.field,symbols).value;
        const bValue= getRowColumn(b,sortQuery.field,symbols).value
        if(bValue === undefined) return 1;
        if(aValue === undefined) return -1;
        if(aValue === b[sortQuery.field]) return sortFunction(a,b,sortables.filter(x=>x!==sortables[0]));
        return ( 
            aValue < bValue ? -1 : 1
        ) * sortQuery.order;
    };

    return data.sort((a,b)=>sortFunction(a,b,sortables));
};

const getRowColumn = (row, key, symbols) => {
    if(/(.*) as (.*)/i.exec(key)){
        console.log('regex ',/(.*) as (.*)/i.exec(key))
        const asName = /(.*) as (.*)/i.exec(key)[2];
        const keyName = /(.*) as (.*)/i.exec(key)[1];
        return {key: asName, value: getRowColumn(row,keyName,symbols).value}
    }

    if(symbols && symbols.hasOwnProperty(key)){
        return getRowColumn(row, symbols[key], symbols);
    }
    
    if(!key.includes('->')) return {key, value: row[key]};

    const splitOnTicks = key.split('\'');
    const initialKey = splitOnTicks[0].replace('->>','').replace('->','');

    if(symbols && symbols.hasOwnProperty(initialKey)){
        const newKey = key.replace(initialKey, symbols[initialKey]);
        return getRowColumn(row, newKey, symbols);
    }

    const initialValue = row[initialKey];

    var keys = splitOnTicks.filter(function(element, index, array) {
        return (index % 2 !== 0);
    });

    return {key, value: keys.reduce((prev,curr)=>prev?.[curr],initialValue)};
};

module.exports = (query, data) => {
    const command = query.trim().split(' ')[0].toLowerCase();

    switch(command) {
        case 'select':
            return select(query, data);
        default:
            throw new Exception(`unrecognized command:${command}`);
    }
};