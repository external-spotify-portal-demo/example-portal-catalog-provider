import { Entity } from '@backstage/catalog-model';
import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import {
  SchedulerServiceTaskRunner,
} from '@backstage/backend-plugin-api';
import { Octokit } from '@octokit/rest';
/**
 * Provides entities from github repos
 */
export class SampleCustomProvider implements EntityProvider {
  private readonly octokit: Octokit;
  private connection?: EntityProviderConnection;
  private taskRunner: SchedulerServiceTaskRunner;
  private githubOrg: string
  /** [1] */
  constructor(
    taskRunner: SchedulerServiceTaskRunner,
    githubToken: string,
    githubOrg: string 
  ) {
    this.taskRunner = taskRunner;
    this.githubOrg = githubOrg;
    this.octokit = new Octokit({ auth: githubToken })
  }

  /** [2] */
  getProviderName(): string {
    return `SampleCustomProvider`;
  }

  /** [3] */
  async connect(connection: EntityProviderConnection): Promise<void> {
    this.connection = connection;
    await this.taskRunner.run({
      id: this.getProviderName(),
      fn: async () => {
        await this.run();
      },
    });
  }

  private async fetchAllRepositories(): Promise<any[]> {
    const repositories: any[] = [];
    const perPage = 100;
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const { data } = await this.octokit.repos.listForOrg({
        org: this.githubOrg,
        per_page: perPage,
        page,
      });

      repositories.push(...data);

      // Check if we need to fetch more pages
      hasNextPage = data.length === perPage;
      page += 1;
    }

    return repositories;
  }

  /** [4] */
  async run(): Promise<void> {
    if (!this.connection) {
      throw new Error('Not initialized');
    }
    try {
      const repositories = await this.fetchAllRepositories();
      /** [5] */
      const entities: Entity[] = repositories.map(repo => ({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: repo.name,
          description: repo.description || '',
          annotations: {
            'github.com/project-slug': `${this.githubOrg}/${repo.name}`,
          },
          tags: repo.topics || [],
        },
        spec: {
          type: 'service',
          owner: repo.owner?.login || 'test-import',
        },
      }));
      /** [6] */
      await this.connection.applyMutation({
        type: 'full',
        entities: entities.map(entity => ({ entity, locationKey: 'sample-custom-provider' })),
      });

      console.log(`Pushed ${entities.length} entities to the catalog.`);
    } catch (error) {
      console.error('Error fetching repositories:', error);
    }
   
    
  }
}