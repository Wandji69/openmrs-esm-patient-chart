import React, { FunctionComponent, useContext } from "react";
//@ts-ignore The present types for single-spa-react are not updated yet for 2.9 which has SingleSpaContext
import { SingleSpaContext } from "single-spa-react";
import { reportError } from "@openmrs/esm-error-handling";
import { ExtensionSlotReact } from "@openmrs/esm-extensions";
import { useCurrentPatient } from "@openmrs/esm-api";

export default function Widget(props: WidgetProps) {
  const [component, setComponent] = React.useState<JSX.Element>(null);
  const [, , patientUuid] = useCurrentPatient();

  const { mountParcel } = useContext(SingleSpaContext);

  React.useEffect(() => {
    //This function is moved inside of the effect to avoid change on every render
    const loadWidgetFromConfig = (widgetConfig: WidgetConfig) => {
      let Component: FunctionComponent<ComponentProps>;
      if (widgetConfig.esModule) {
        System.import(widgetConfig.esModule)
          .then(module => {
            if (module[widgetConfig.name]) {
              Component = module[widgetConfig.name];
              const widgetProps = { ...props.widgetConfig.props };
              if (props.widgetConfig.config) {
                widgetProps["config"] = props.widgetConfig.config;
              }
              if (props.widgetConfig.usesSingleSpaContext) {
                widgetProps["mountParcel"] = mountParcel;
              }
              setComponent(() => (
                <Component
                  props={widgetProps}
                  basePath={widgetConfig.basePath}
                />
              ));
            } else {
              const message = `${widgetConfig.name} does not exist in module ${widgetConfig.esModule}`;
              reportError(message);
              setComponent(() => <div>${message}</div>);
            }
          })
          .catch(error => {
            const message = `${widgetConfig.esModule} failed to load`;
            reportError(`${message}:\n` + error);
            setComponent(() => <div>${message}</div>);
          });
      } else if (widgetConfig.extensionSlotName) {
        setComponent(() => (
          <ExtensionSlotReact
            extensionSlotName={widgetConfig.extensionSlotName}
            state={{ patientUuid }}
          />
        ));
      } else {
        // config schema should be fixed so that this is caught in validation
        reportError(
          `No esModule provided in the config for widget: ${widgetConfig.name}`
        );
        setComponent(() => <div>No module provided</div>);
      }
    };
    loadWidgetFromConfig(props.widgetConfig);
  }, [patientUuid, props.widgetConfig, mountParcel]);

  return <>{component || <div>Loading</div>}</>;
}

export type WidgetProps = {
  widgetConfig: WidgetConfig;
};

export type WidgetConfig = {
  name: string;
  esModule?: string;
  extensionSlotName?: string;
  usesSingleSpaContext?: boolean;
  layout?: {
    rowSpan?: number;
    columnSpan?: number;
  };
  props?: object;
  config?: object;
  basePath?: string;
};

type ComponentProps = {
  props: any;
  basePath?: string;
};
