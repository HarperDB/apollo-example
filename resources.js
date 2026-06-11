
import { databases, Resource } from 'harper';
const { Breed } = databases.demo;

const API_URL = 'https://api.api-ninjas.com/v1/dogs?name=';
const API_KEY = 'XXXXXXXXXXXXXXXXXXXXXXXXXX';
class BreedResource extends Resource {
  // Cache source: Breed.sourcedFrom(BreedResource) resolves each id by instantiating
  // this resource and calling the INSTANCE get(query). A static get() would never be
  // invoked by the cache, so it must remain an instance method (matches Harper's own
  // SimpleCacheSource reference).
  async get(query) {
    let name = this.getId().toLowerCase();

    let response = await fetch(API_URL + name, { headers: { 'X-Api-Key': API_KEY } });
    if (!response.ok) return undefined;
    let data = await response.json();
    let detail;

    //this API does partial word search and returns multiple results.  we want the exactname match entry
    for (const entry of data) {
      if (entry.name.toLowerCase() === name) {
        detail = entry;
        break;
      }
    }

    return detail;
  }
}
Breed.sourcedFrom(BreedResource, { replicationSource: true });
