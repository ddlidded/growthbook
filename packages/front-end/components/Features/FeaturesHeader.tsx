import { useRouter } from "next/router";
import React, { useMemo, useState } from "react";
import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import { FeatureInterface } from "back-end/types/feature";
import { ExperimentInterfaceStringDates } from "back-end/types/experiment";
import { filterEnvironmentsByFeature, isFeatureStale } from "shared/util";
import { getDemoDatasourceProjectIdForOrganization } from "shared/demo-datasource";
import { FaExclamationTriangle } from "react-icons/fa";
import { useUser } from "@/services/UserContext";
import { DeleteDemoDatasourceButton } from "@/components/DemoDataSourcePage/DemoDataSourcePage";
import StaleFeatureIcon from "@/components/StaleFeatureIcon";
import DeleteButton from "@/components/DeleteButton/DeleteButton";
import ConfirmButton from "@/components/Modal/ConfirmButton";
import { getEnabledEnvironments, useEnvironments } from "@/services/features";
import { useAuth } from "@/services/auth";
import { useDefinitions } from "@/services/DefinitionsContext";
import Tooltip from "@/components/Tooltip/Tooltip";
import SortedTags from "@/components/Tags/SortedTags";
import WatchButton from "@/components/WatchButton";
import Modal from "@/components/Modal";
import HistoryTable from "@/components/HistoryTable";
import FeatureImplementationModal from "@/components/Features/FeatureImplementationModal";
import FeatureModal from "@/components/Features/FeatureModal";
import StaleDetectionModal from "@/components/Features/StaleDetectionModal";
import { FeatureTab } from "@/pages/features/[fid]";
import MoreMenu from "@/components/Dropdown/MoreMenu";
import usePermissionsUtil from "@/hooks/usePermissionsUtils";
import UserAvatar from "@/components/Avatar/UserAvatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/Radix/Tabs";
import Callout from "@/components/Radix/Callout";
import ProjectBadges from "@/components/ProjectBadges";

export default function FeaturesHeader({
  feature,
  features,
  experiments,
  mutate,
  tab,
  setTab,
  setEditFeatureInfoModal,
  dependents,
}: {
  feature: FeatureInterface;
  features: FeatureInterface[];
  experiments: ExperimentInterfaceStringDates[] | undefined;
  mutate: () => void;
  tab: FeatureTab;
  setTab: (tab: FeatureTab) => void;
  setEditFeatureInfoModal: (open: boolean) => void;
  dependents: number;
}) {
  const router = useRouter();
  const projectId = feature?.project;
  const firstFeature = router?.query && "first" in router.query;
  const [auditModal, setAuditModal] = useState(false);
  const [duplicateModal, setDuplicateModal] = useState(false);
  const [staleFFModal, setStaleFFModal] = useState(false);
  const [showImplementation, setShowImplementation] = useState(firstFeature);

  const { organization } = useUser();
  const permissionsUtil = usePermissionsUtil();
  const allEnvironments = useEnvironments();
  const environments = filterEnvironmentsByFeature(allEnvironments, feature);
  const envs = environments.map((e) => e.id);
  const { apiCall } = useAuth();
  const {
    getProjectById,
    project: currentProject,
    projects,
  } = useDefinitions();

  const { stale, reason } = useMemo(() => {
    if (!feature) return { stale: false };
    return isFeatureStale({
      feature,
      features,
      experiments,
      environments: envs,
    });
  }, [feature, features, experiments, envs]);

  const project = getProjectById(projectId || "");
  const projectName = project?.name || null;
  const projectIsDeReferenced = projectId && !projectName;

  const canEdit = permissionsUtil.canViewFeatureModal(projectId);
  const enabledEnvs = getEnabledEnvironments(feature, environments);
  const canPublish = permissionsUtil.canPublishFeature(feature, enabledEnvs);
  const isArchived = feature.archived;

  return (
    <>
      <Box className="features-header contents container-fluid pagecontents mt-2">
        <Box>
          {projectId ===
            getDemoDatasourceProjectIdForOrganization(organization.id) && (
            <Callout status="info" mb="3">
              <Flex align="start" gap="6">
                <Box>
                  This feature is part of our sample dataset and shows how
                  Feature Flags and Experiments can be linked together. You can
                  delete this once you are done exploring.
                </Box>
                <Flex flexShrink="0">
                  <DeleteDemoDatasourceButton
                    onDelete={() => router.push("/features")}
                    source="feature"
                  />
                </Flex>
              </Flex>
            </Callout>
          )}

          <Flex align="center" justify="between">
            <Flex align="center">
              <Heading size="7" as="h1">
                {feature.id}
              </Heading>
              {stale && (
                <div className="ml-2">
                  <StaleFeatureIcon
                    staleReason={reason}
                    onClick={() => setStaleFFModal(true)}
                  />
                </div>
              )}
            </Flex>
            <Box>
              <MoreMenu useRadix={true}>
                {canEdit && canPublish && (
                  <a
                    className="dropdown-item"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setEditFeatureInfoModal(true);
                    }}
                  >
                    Edit information
                  </a>
                )}
                <a
                  className="dropdown-item"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowImplementation(true);
                  }}
                >
                  Show implementation
                </a>
                <a
                  className="dropdown-item"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setAuditModal(true);
                  }}
                >
                  View Audit Log
                </a>
                {canEdit && (
                  <>
                    <a
                      className="dropdown-item"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setStaleFFModal(true);
                      }}
                    >
                      {feature.neverStale
                        ? "Enable stale detection"
                        : "Disable stale detection"}
                    </a>
                  </>
                )}
                {canEdit && canPublish && (
                  <a
                    className="dropdown-item"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setDuplicateModal(true);
                    }}
                  >
                    Duplicate
                  </a>
                )}
                {canEdit && canPublish && (
                  <ConfirmButton
                    onClick={async () => {
                      await apiCall(`/feature/${feature.id}/archive`, {
                        method: "POST",
                      });
                      mutate();
                    }}
                    modalHeader={
                      isArchived ? "Unarchive Feature" : "Archive Feature"
                    }
                    confirmationText={
                      isArchived ? (
                        <>
                          <p>
                            Are you sure you want to continue? This will make
                            the current feature active again.
                          </p>
                        </>
                      ) : (
                        <>
                          <p>
                            Are you sure you want to continue? This will make
                            the current feature inactive. It will not be
                            included in API responses or Webhook payloads.
                          </p>
                        </>
                      )
                    }
                    cta={isArchived ? "Unarchive" : "Archive"}
                    ctaColor="danger"
                    ctaEnabled={dependents === 0}
                    additionalMessage={
                      dependents > 0 ? (
                        <Callout status="error">
                          This feature has{" "}
                          <strong>
                            {dependents} dependent{dependents !== 1 && "s"}
                          </strong>
                          . This feature cannot be archived until{" "}
                          {dependents === 1 ? "it has" : "they have"} been
                          removed.
                        </Callout>
                      ) : undefined
                    }
                  >
                    <button className="dropdown-item">
                      {isArchived ? "Unarchive" : "Archive"}
                    </button>
                  </ConfirmButton>
                )}
                {canEdit && canPublish && (
                  <>
                    <hr className="my-2" />
                    <DeleteButton
                      useIcon={false}
                      displayName="Feature"
                      onClick={async () => {
                        await apiCall(`/feature/${feature.id}`, {
                          method: "DELETE",
                        });
                        await router.push("/features");
                      }}
                      className="dropdown-item text-danger"
                      text="Delete"
                      canDelete={dependents === 0}
                      additionalMessage={
                        dependents > 0 ? (
                          <Callout status="error">
                            This feature has{" "}
                            <strong>
                              {dependents} dependent{dependents !== 1 && "s"}
                            </strong>
                            . This feature cannot be deleted until{" "}
                            {dependents === 1 ? "it has" : "they have"} been
                            removed.
                          </Callout>
                        ) : undefined
                      }
                    />
                  </>
                )}
              </MoreMenu>
            </Box>
          </Flex>
          <Flex gap="4">
            {(projects.length > 0 || projectIsDeReferenced) && (
              <Box>
                <Text weight="medium">Project: </Text>
                {projectIsDeReferenced ? (
                  <Tooltip
                    body={
                      <>
                        Project <code>{projectId}</code> not found
                      </>
                    }
                  >
                    <span className="text-danger">
                      <FaExclamationTriangle /> Invalid project
                    </span>
                  </Tooltip>
                ) : currentProject && currentProject !== feature.project ? (
                  <Tooltip
                    body={<>This feature is not in your current project.</>}
                  >
                    {projectId ? <strong>{projectName}</strong> : null}{" "}
                    <FaExclamationTriangle className="text-warning" />
                  </Tooltip>
                ) : projectId ? (
                  <ProjectBadges
                    resourceType="feature"
                    projectIds={projectId ? [projectId] : []}
                  />
                ) : null}
                {canEdit && canPublish && !projectId && (
                  <a
                    role="button"
                    className="cursor-pointer button-link"
                    onClick={(e) => {
                      e.preventDefault();
                      setEditFeatureInfoModal(true);
                    }}
                  >
                    +Add
                  </a>
                )}
              </Box>
            )}

            <Box>
              <Text weight="medium">Feature Key: </Text>
              {feature.id || "-"}
            </Box>

            <Box>
              <Text weight="medium">Type: </Text>
              {feature.valueType || "unknown"}
            </Box>

            <Box>
              <Text weight="medium">Owner: </Text>
              {feature.owner ? (
                <span>
                  <UserAvatar name={feature.owner} size="sm" variant="soft" />{" "}
                  {feature.owner}
                </span>
              ) : (
                <em className="text-muted">None</em>
              )}
            </Box>
            <Box>
              <WatchButton item={feature.id} itemType="feature" type="link" />
            </Box>
          </Flex>
          <Box mt="3" mb="4">
            <Box>
              <Text weight="medium">Tags: </Text>
              <SortedTags
                tags={feature.tags || []}
                useFlex
                shouldShowEllipsis={false}
              />
            </Box>
          </Box>
          <div>
            {isArchived && (
              <div className="alert alert-secondary mb-2">
                <strong>This feature is archived.</strong> It will not be
                included in SDK Endpoints or Webhook payloads.
              </div>
            )}
          </div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList size="3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="test">Simulate</TabsTrigger>
              <TabsTrigger value="stats">Code Refs</TabsTrigger>
            </TabsList>
          </Tabs>
        </Box>
      </Box>
      {auditModal && (
        <Modal
          trackingEventModalType=""
          open={true}
          header="Audit Log"
          close={() => setAuditModal(false)}
          size="max"
          closeCta="Close"
        >
          <HistoryTable type="feature" id={feature.id} />
        </Modal>
      )}
      {duplicateModal && (
        <FeatureModal
          cta={"Duplicate"}
          close={() => setDuplicateModal(false)}
          onSuccess={async (feature) => {
            const url = `/features/${feature.id}?new`;
            await router.push(url);
          }}
          featureToDuplicate={feature}
        />
      )}
      {staleFFModal && (
        <StaleDetectionModal
          close={() => setStaleFFModal(false)}
          feature={feature}
          mutate={mutate}
        />
      )}
      {showImplementation && (
        <FeatureImplementationModal
          feature={feature}
          first={firstFeature}
          close={() => {
            setShowImplementation(false);
          }}
        />
      )}
    </>
  );
}
