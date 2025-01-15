import {
  coreServices,
  createBackendModule,
  SchedulerServiceTaskRunner,
  readSchedulerServiceTaskScheduleDefinitionFromConfig
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';

import { SampleCustomProvider } from './SampleCustomProvider';

export const catalogModuleCustomProviderExample = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'custom-provider-example',
  register(reg) {
    reg.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        rootConfig: coreServices.rootConfig,
        scheduler: coreServices.scheduler,
      },
      async init({ catalog, rootConfig, scheduler }) {
        const config = rootConfig.getConfig('catalog.providers.sampleCustomProvider'); // Generally, catalog config goes under catalog.providers.pluginId
        const githubToken = config.getString('token');
        const githubOrg = config.getString('org');
        // Add a default schedule if you don't define one in config.
        const schedule = config.has('schedule')
          ? readSchedulerServiceTaskScheduleDefinitionFromConfig(
            config.getConfig('schedule'),
          )
          : {
            frequency: { minutes: 60 },
            timeout: { minutes: 50 },
          };
        const taskRunner: SchedulerServiceTaskRunner =
          scheduler.createScheduledTaskRunner(schedule);

        const sampleCustomProvider = new SampleCustomProvider(taskRunner, githubToken, githubOrg);
        catalog.addEntityProvider(sampleCustomProvider);
      },
    });
  },
});
