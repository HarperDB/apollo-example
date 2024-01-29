const {Dog, Breed} = databases.demo;

/** Here we can define Apollo resolvers */
const resolvers = {
	Query: {
		dogs: async (parent, args, context, info) =>{
			const dogs = await Dog.search({
				conditions: [
					{ attribute: 'id', value: -1, comparator: 'greater_than' }
				]
			});
			return dogs;
		},
		dog: async (parent, args, context, info) => {
			let id = Number(args.id)
			return await Dog.get(id);
		},
		dogsByBreedName: async (parent, args, context, info) => {
			let results = await Dog.search({
				conditions: [
					{ attribute: 'breedName', value: args.breedName, comparator: 'equal' }
				]
			});

			return results;
		},
		breeds: async (parent, args, context, info) =>{
			let breeds = Breed.search({
				conditions: [
					{ attribute: 'name', value: -1, comparator: 'greater_than' }
				]
			});
			return breeds;
		},
		breed: async (parent, args, context, info) => {
			args.name = args.name.toLowerCase();
			return Breed.get(args.name);
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

			args.id = Number(args.id);
			args.dob = args.dob ? new Date(args.dob): undefined
			//setting the name to exactly match the casing from the breed entry
			args.breedName = breed.name;
			await Dog.put(args);
			return args;
		},
		deleteDog: async (parent, args, context, info) =>{
			const id = Number(args.id);
			await Dog.delete(id);
		}
	},
	Dog: {
		breed(parent) {
			return Breed.get(parent.breedName);
		}
	},
	Breed: {
		async dogs(parent) {
			let results = await Dog.search({
				conditions: [
					{ attribute: 'breedName', value: parent.name, comparator: 'equal' }
				]
			});

			let dogs = [];
			for await (let dog of results) {
				dogs.push(dog)
			}

			return dogs;
		}
	}

};

export default resolvers;
