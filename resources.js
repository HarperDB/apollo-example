
const {Breed} = databases.demo;

const API_URL = 'https://api.api-ninjas.com/v1/dogs?name=';
const API_KEY = 'XXXXXXXXXXXXXXXXXXXXXXXXXX';
class BreedResource extends Resource {
  async get() {
    let name = this.getId().toLowerCase();

    let response = await fetch(API_URL + name, {headers: {'X-Api-Key':API_KEY}});
    let data = await response.json();
    let detail;

    //this API does partial word search and returns multiple results.  we want the exactname match entry
    for(const entry of data) {
      if(entry.name.toLowerCase() === name) {
        detail = entry;
        break;
      }
    }

    return detail;
  }
}
Breed.sourcedFrom(BreedResource, { replicationSource: true });
