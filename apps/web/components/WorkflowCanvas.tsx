'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { NodeModal } from '@/components/NodeModal';
import { KnowledgeBasePanel } from '@/components/KnowledgeBasePanel';
import { ChatPanel } from '@/components/ChatPanel';
import { ModelKeysPanel } from '@/components/ModelKeysPanel';

type OpenNode = 'chat' | 'knowledge-base' | 'model' | null;

type NodeKind = 'trigger' | 'agent' | 'sub';

type WorkflowNodeData = {
  icon: string;
  label: string;
  sublabel: string;
  interactive: boolean;
  kind: NodeKind;
};

function WorkflowNode({ data }: NodeProps<Node<WorkflowNodeData>>) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-md bg-gray-100 px-4 py-3 shadow-raised transition-colors ${
        data.interactive ? 'hover:bg-gray-200 cursor-pointer' : ''
      }`}
    >
      {(data.kind === 'agent' || data.kind === 'sub') && (
        <Handle
          type="target"
          position={data.kind === 'sub' ? Position.Top : Position.Left}
          className="!bg-gray-600 !border-gray-900"
        />
      )}
      <span className="material-symbols-outlined text-gray-1000">{data.icon}</span>
      <div className="text-left">
        <div className="text-label-14 text-gray-1000">{data.label}</div>
        <div className="text-copy-13 text-gray-600">{data.sublabel}</div>
      </div>
      {(data.kind === 'trigger' || data.kind === 'agent') && (
        <Handle
          type="source"
          position={data.kind === 'agent' ? Position.Bottom : Position.Right}
          className="!bg-gray-600 !border-gray-900"
        />
      )}
    </div>
  );
}

const nodeTypes = { workflow: WorkflowNode };

/**
 * fitView (the boolean prop) measures node sizes once at mount. On a cold load the
 * Material Symbols font — loaded via a plain <link>, not next/font — hasn't downloaded
 * yet, so nodes measure smaller than their final size and the viewport ends up zoomed
 * into that stale, too-small/off-center fit with nothing re-triggering it. Re-fit once
 * fonts (and a couple of animation frames for layout to settle) are actually ready.
 */
function FitViewOnReady() {
  const { fitView } = useReactFlow();

  useEffect(() => {
    let cancelled = false;

    function refit() {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) fitView({ padding: 0.15, duration: 200 });
        });
      });
    }

    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(refit).catch(refit);
    } else {
      refit();
    }

    return () => {
      cancelled = true;
    };
  }, [fitView]);

  return null;
}

const initialNodes: Node<WorkflowNodeData>[] = [
  {
    id: 'chat',
    type: 'workflow',
    position: { x: 20, y: 40 },
    data: { icon: 'chat', label: 'Chat Message', sublabel: 'Trigger', interactive: true, kind: 'trigger' },
  },
  {
    id: 'agent',
    type: 'workflow',
    position: { x: 300, y: 40 },
    data: { icon: 'hub', label: 'AI Agent', sublabel: 'Orchestrator', interactive: false, kind: 'agent' },
  },
  {
    id: 'knowledge-base',
    type: 'workflow',
    position: { x: 200, y: 220 },
    data: {
      icon: 'database',
      label: 'Knowledge Base',
      sublabel: 'Documents & URLs',
      interactive: true,
      kind: 'sub',
    },
  },
  {
    id: 'model',
    type: 'workflow',
    position: { x: 460, y: 220 },
    data: { icon: 'smart_toy', label: 'Model', sublabel: 'Provider keys', interactive: true, kind: 'sub' },
  },
];

const mainEdgeStyle = { stroke: '#8f8f8f', strokeWidth: 2 };
const mainMarkerEnd = { type: MarkerType.ArrowClosed, color: '#8f8f8f', width: 18, height: 18 };
const subEdgeStyle = { stroke: '#5c5c5c', strokeWidth: 1.5, strokeDasharray: '5 4' };

const initialEdges: Edge[] = [
  {
    id: 'chat-agent',
    source: 'chat',
    target: 'agent',
    type: 'smoothstep',
    style: mainEdgeStyle,
    markerEnd: mainMarkerEnd,
  },
  {
    id: 'agent-kb',
    source: 'agent',
    target: 'knowledge-base',
    type: 'smoothstep',
    style: subEdgeStyle,
  },
  {
    id: 'agent-model',
    source: 'agent',
    target: 'model',
    type: 'smoothstep',
    style: subEdgeStyle,
  },
];

export function WorkflowCanvas({
  isAuthenticated,
  onIngested,
  onMessageSent,
}: {
  isAuthenticated: boolean;
  onIngested: () => void;
  onMessageSent: () => void;
}) {
  const [openNode, setOpenNode] = useState<OpenNode>(null);
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.id === 'chat') setOpenNode('chat');
    else if (node.id === 'knowledge-base') setOpenNode('knowledge-base');
    else if (node.id === 'model') setOpenNode('model');
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="workflow-canvas flex-grow min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          minZoom={0.4}
          maxZoom={2}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          proOptions={{ hideAttribution: true }}
          nodesConnectable={false}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls showInteractive={false} />
          <FitViewOnReady />
        </ReactFlow>
      </div>

      {openNode === 'chat' && (
        <NodeModal title="Chat Message" icon="chat" onClose={() => setOpenNode(null)}>
          <ChatPanel isAuthenticated={isAuthenticated} onMessageSent={onMessageSent} />
        </NodeModal>
      )}

      {openNode === 'knowledge-base' && (
        <NodeModal title="Knowledge Base" icon="database" onClose={() => setOpenNode(null)}>
          <KnowledgeBasePanel isAuthenticated={isAuthenticated} onIngested={onIngested} />
        </NodeModal>
      )}

      {openNode === 'model' && (
        <NodeModal title="Model" icon="smart_toy" onClose={() => setOpenNode(null)}>
          <ModelKeysPanel isAuthenticated={isAuthenticated} />
        </NodeModal>
      )}
    </div>
  );
}
