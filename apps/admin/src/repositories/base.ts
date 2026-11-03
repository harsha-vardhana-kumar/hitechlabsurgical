import type { AdminWorkspace } from '@hitech/types/admin';
/** Query facets provide a stable integration seam without coupling UI to a storage engine. */
export abstract class RepositoryQueries {
  abstract load():Promise<AdminWorkspace>;
  async listProducts(){return (await this.load()).products;}
  async listCategories(){return (await this.load()).categories;}
  async listMedia(){return (await this.load()).media;}
  async listEnquiries(){return (await this.load()).enquiries;}
  async readSettings(){return (await this.load()).settings;}
  async listActivity(){return (await this.load()).activity;}
}
