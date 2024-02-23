const {Dog, Breed} = databases.demo;

/** Here we can define Apollo resolvers */
const resolvers = {
	Query: {
		dogs: async (parent, args, context, info) =>{
			let conditions = generateConditions(args?.dog);
			let search = {select:createSelect(info?.fieldNodes["0"]?.selectionSet?.selections)};
			if(conditions.length > 0) {
				search.operator = conditions.length > 1 ? 'or' : 'and';
				search.conditions = conditions;
			}

			return Dog.search(search);
		},
		dog: async (parent, args, context, info) => {
			return Dog.get({id: args.id, select:createSelect(info?.fieldNodes["0"]?.selectionSet?.selections)});
		},
		dogsByBreedName: async (parent, args, context, info) => {
			//here we show how to delegate authorization to harperdb
			//this line instructs HarperDB to authorize the search on the context
			context.authorize = true;
			//passing the context gives further instructions to HarperDB, in this case telling it to authorize the search
			return  Dog.search({
				conditions: [
					{ attribute: 'breedName', value: args.breedName, comparator: 'equal' }
				],

			}, context);
		},
		breeds: async (parent, args, context, info) =>{
			let conditions = generateConditions(args?.dog);
			let search = {select:createSelect(info?.fieldNodes["0"]?.selectionSet?.selections)};
			if(conditions.length > 0) {
				search.operator = conditions.length > 1 ? 'or' : 'and';
				search.conditions = conditions;
			}
			return Breed.search(search);
		},
		breed: async (parent, args, context, info) => {
			args.name = args.name.toLowerCase();
			return Breed.get({name: args.name, select:createSelect(info?.fieldNodes["0"]?.selectionSet?.selections)});
		},
	},
	Mutation: {
		putDog: async (parent, args, context, info) =>{
			//first check for the breed.  This will also auto cache the breed record
			args.breedName = args.breedName.toLowerCase();
			let breed = await Breed.get(args.breedName);
			if(!breed) {
				throw Error(`invalid breedName '${args.breedName}', breed not found. `)
			}

			//setting the name to exactly match the casing from the breed entry
			args.breedName = breed.name;
			await Dog.put(args);
			return args;
		},
		deleteDog: async (parent, args, context, info) =>{
			return Dog.delete(args.id);
		}
	},

};

/**
 * This is a generic example of how to generate a condition array from an args object
 * @param args
 * @param prefix
 * @param conditions
 * @returns {*[]}
 */
function generateConditions(args, prefix = [], conditions = []) {
	if(!args) {
		return conditions;
	}

	for (const [key, value] of Object.entries(args)) {
		if(typeof value === "object") {
			generateConditions(value, prefix.concat([key]), conditions);
		} else {
			conditions.push({attribute: prefix.concat([key]), value, comparator: 'equal' })
		}
	}
	return conditions;
}

function createSelect(selections, relationshipName, select = []) {
	let relation;
	if(relationshipName) {
		relation = {name: relationshipName, select: []};
		select.push(relation);
	}

	selections.forEach(item=>{
		if(item.selectionSet) {
			createSelect(item.selectionSet.selections, item.name.value, select);
		} else {
			if(relationshipName) {
				relation.select.push(item.name.value);
			} else {
				select.push(item.name.value);
			}
		}
	});

	return select;
}

export default resolvers;
