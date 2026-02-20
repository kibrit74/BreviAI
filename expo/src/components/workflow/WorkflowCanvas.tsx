/**
 * WorkflowCanvas - Node-based visual workflow editor
 * Optimized with Reanimated & Gesture Handler for Infinite Canvas
 * n8n Style Implementation: Bezier Curves, Clean Nodes
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Text,
    Pressable,
    PanResponder,
    Animated as RNAnimated,
    Alert,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
    useSharedValue,
    useAnimatedStyle,
    runOnJS
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';
import {
    Workflow,
    WorkflowNode,
    WorkflowEdge,
    NodeType,
    EdgePort,
    NODE_REGISTRY,
    createEdge,
} from '../../types/workflow-types';
import { useApp } from '../../context/AppContext';
import { copySingleNode, pasteNodes, duplicateNode } from '../../services/WorkflowClipboard';
import { evaluateConnectionCompatibility } from '../../services/WorkflowTypeCompatibility';

// --- Default Theme Fallback (if not in context) ---
const DEFAULT_THEME = {
    background: '#F3F4F6',
    card: '#FFFFFF',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    primary: '#6366F1',
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_SIZE = 20;
const NODE_WIDTH = 180; // Default width
const NODE_HEIGHT = 70; // Default height

// Bezier Curve Helper for t=0.5 (Midpoint)
// P0: Start, P1: Control 1, P2: Control 2, P3: End
const getBezierPoint = (t: number, p0: number, p1: number, p2: number, p3: number) => {
    const cX = 3 * (p1 - p0);
    const bX = 3 * (p2 - p1) - cX;
    const aX = p3 - p0 - cX - bX;

    const x = (aX * Math.pow(t, 3)) + (bX * Math.pow(t, 2)) + (cX * t) + p0;
    return x;
};

// Dynamic node dimensions for larger text nodes
const getNodeDimensions = (type: NodeType) => {
    switch (type) {
        case 'TEXT_INPUT':
        case 'SHOW_TEXT':
        case 'AGENT_AI':
            return { width: 220, height: 85 };
        default:
            return { width: NODE_WIDTH, height: NODE_HEIGHT };
    }
};

const truncateValue = (value: string, maxLength = 36): string => {
    if (!value) return '';
    const trimmed = value.trim();
    if (trimmed.length <= maxLength) return trimmed;
    return `${trimmed.slice(0, maxLength - 1)}...`;
};

const summarizeNodeConfig = (node: WorkflowNode): string => {
    const config = (node.config || {}) as Record<string, any>;
    const variableName = typeof config.variableName === 'string' ? config.variableName.trim() : '';
    const url = typeof config.url === 'string' ? config.url.trim() : '';

    switch (node.type) {
        case 'HTTP_REQUEST': {
            const method = typeof config.method === 'string' ? config.method.toUpperCase() : 'GET';
            return url ? `${method} ${truncateValue(url, 28)}` : method;
        }
        case 'WEB_AUTOMATION':
        case 'BROWSER_SCRAPE':
            return url ? truncateValue(url, 32) : 'Web source not set';
        case 'EMAIL_SEND': {
            const to = typeof config.to === 'string' ? config.to : '';
            return to ? `to ${truncateValue(to, 28)}` : 'Recipient missing';
        }
        case 'WHATSAPP_SEND': {
            const phone = typeof config.phone === 'string' ? config.phone : '';
            return phone ? `to ${truncateValue(phone, 22)}` : 'Target missing';
        }
        case 'IF_ELSE': {
            const conditions = Array.isArray(config.conditions) ? config.conditions.length : 0;
            return conditions > 0 ? `${conditions} condition${conditions > 1 ? 's' : ''}` : 'No condition yet';
        }
        case 'SHOW_TEXT':
            return typeof config.title === 'string' && config.title.trim() ? truncateValue(config.title, 30) : 'Preview text';
        default:
            if (variableName) return `var: ${truncateValue(variableName, 24)}`;
            if (url) return truncateValue(url, 32);
            return '';
    }
};

interface WorkflowCanvasProps {
    workflow: Workflow;
    onWorkflowChange: (workflow: Workflow) => void;
    onNodeSelect: (node: WorkflowNode | null) => void;
    selectedNodeId: string | null;
    onQuickAddRequested?: (req: { sourceNodeId: string; port: EdgePort; position: { x: number; y: number } }) => void;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
    workflow,
    onWorkflowChange,
    onNodeSelect,
    selectedNodeId,
    onQuickAddRequested,
}) => {
    const { theme, colors: appColors } = useApp();
    const colors = appColors || DEFAULT_THEME;
    const isDark = theme === 'dark';

    // Reanimated Shared Values
    const translationX = useSharedValue(0);
    const translationY = useSharedValue(0);
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);

    // JS Logic State
    const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; port: EdgePort } | null>(null);
    const [activeMenuNodeId, setActiveMenuNodeId] = useState<string | null>(null);
    const [draggingConnection, setDraggingConnection] = useState<{
        sourceNodeId: string;
        port: EdgePort;
        start: { x: number; y: number };
        end: { x: number; y: number };
        hoverTargetNodeId?: string | null;
        isCompatible?: boolean;
        mismatchReason?: string;
    } | null>(null);

    const containerRef = useRef<View>(null);
    const [containerOffset, setContainerOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    // Wrapper to safely call from UI thread
    const closeMenu = () => {
        setActiveMenuNodeId(null);
    };

    // Pan Gesture (for Canvas)
    const panGesture = Gesture.Pan()
        .minDistance(10) // Require explicit movement to start pan, allowing taps to pass through
        .enabled(connectingFrom === null && draggingConnection === null) // Disable pan when connecting to allow easier port clicking
        .averageTouches(true)
        .onStart(() => {
            startX.value = translationX.value;
            startY.value = translationY.value;
            runOnJS(closeMenu)(); // Always call, let JS decide if update needed
        })
        .onUpdate((e) => {
            translationX.value = startX.value + e.translationX;
            translationY.value = startY.value + e.translationY;
        });

    // Pinch Gesture (Zoom)
    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            savedScale.value = scale.value;
        });

    const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translationX.value },
                { translateY: translationY.value },
                { scale: scale.value },
            ] as any,
        };
    });

    // Update node position
    const updateNodePosition = useCallback((nodeId: string, dx: number, dy: number) => {
        console.log('[DEBUG] updateNodePosition:', { nodeId, dx, dy, existingNodes: workflow.nodes.length });

        const updatedNodes = workflow.nodes.map(node => {
            if (node.id === nodeId) {
                const newX = Math.round((node.position.x + dx) / GRID_SIZE) * GRID_SIZE;
                const newY = Math.round((node.position.y + dy) / GRID_SIZE) * GRID_SIZE;
                console.log(`[DEBUG] Moving node ${node.id} to (${newX}, ${newY})`);
                return {
                    ...node,
                    position: { x: newX, y: newY },
                };
            }
            return node;
        });

        if (updatedNodes.length !== workflow.nodes.length) {
            console.error('[CRITICAL] Node count mismatch after update!', { before: workflow.nodes.length, after: updatedNodes.length });
        }

        onWorkflowChange({ ...workflow, nodes: updatedNodes });
    }, [workflow, onWorkflowChange]);

    // Delete node
    const deleteNode = useCallback((nodeId: string) => {
        const updatedNodes = workflow.nodes.filter(n => n.id !== nodeId);
        const updatedEdges = workflow.edges.filter(
            e => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId
        );
        onWorkflowChange({ ...workflow, nodes: updatedNodes, edges: updatedEdges });
        if (selectedNodeId === nodeId) onNodeSelect(null);
    }, [workflow, onWorkflowChange, selectedNodeId, onNodeSelect]);

    const checkConnectionCompatibility = useCallback((sourceNodeId: string, targetNodeId: string, sourcePort: EdgePort) => {
        const sourceNode = workflow.nodes.find(n => n.id === sourceNodeId);
        const targetNode = workflow.nodes.find(n => n.id === targetNodeId);
        if (!sourceNode || !targetNode) {
            return { compatible: false, reason: 'Node bulunamadı.' };
        }
        return evaluateConnectionCompatibility(sourceNode, sourcePort, targetNode);
    }, [workflow.nodes]);

    // Edge Ops
    const addEdge = useCallback((sourceNodeId: string, targetNodeId: string, sourcePort: EdgePort) => {
        console.log('[DEBUG] addEdge called:', { sourceNodeId, targetNodeId, sourcePort });
        const exists = workflow.edges.some(e => e.sourceNodeId === sourceNodeId && e.targetNodeId === targetNodeId && e.sourcePort === sourcePort);
        if (exists) {
            console.log('[DEBUG] Edge already exists, skipping');
            return;
        }

        const compatibility = checkConnectionCompatibility(sourceNodeId, targetNodeId, sourcePort);
        if (!compatibility.compatible) {
            Alert.alert(
                'Uyumsuz bağlantı',
                `Bu node bağlantısı veri tipi uyuşmadığı için kurulamaz.\n${compatibility.reason || ''}`
            );
            return;
        }

        const newEdge = createEdge(sourceNodeId, targetNodeId, sourcePort);
        console.log('[DEBUG] Creating new edge:', newEdge);
        onWorkflowChange({ ...workflow, edges: [...workflow.edges, newEdge] });
    }, [workflow, onWorkflowChange, checkConnectionCompatibility]);

    const deleteEdge = useCallback((edgeId: string) => {
        onWorkflowChange({ ...workflow, edges: workflow.edges.filter(e => e.id !== edgeId) });
    }, [workflow, onWorkflowChange]);

    // Connections
    const startConnection = useCallback((nodeId: string, port: EdgePort) => {
        console.log('[DEBUG] startConnection:', { nodeId, port });
        setConnectingFrom({ nodeId, port });
    }, []);
    const completeConnection = useCallback((targetNodeId: string) => {
        console.log('[DEBUG] completeConnection:', { connectingFrom, targetNodeId });
        if (connectingFrom && connectingFrom.nodeId !== targetNodeId) {
            addEdge(connectingFrom.nodeId, targetNodeId, connectingFrom.port);
        }
        setConnectingFrom(null);
    }, [connectingFrom, addEdge]);
    const cancelConnection = useCallback(() => setConnectingFrom(null), []);

    const pageToCanvas = useCallback((pageX: number, pageY: number) => {
        const localX = pageX - containerOffset.x;
        const localY = pageY - containerOffset.y;
        const canvasX = (localX - translationX.value) / scale.value;
        const canvasY = (localY - translationY.value) / scale.value;
        return { x: canvasX, y: canvasY };
    }, [containerOffset, translationX, translationY, scale]);

    const getOutputPortPosition = useCallback((node: WorkflowNode, port: EdgePort) => {
        const outputPorts: EdgePort[] = NODE_REGISTRY[node.type]?.outputPorts || ['default'];
        const { width, height } = getNodeDimensions(node.type);
        const index = Math.max(0, outputPorts.indexOf(port));
        const x = node.position.x + width + 20;
        const y = node.position.y + (height / 2) + (index * 36);
        return { x, y };
    }, []);

    const getInputPortPosition = useCallback((node: WorkflowNode) => {
        const { height } = getNodeDimensions(node.type);
        const x = node.position.x - 20;
        const y = node.position.y + (height / 2);
        return { x, y };
    }, []);

    const findClosestInputNode = useCallback((sourceId: string, end: { x: number; y: number }) => {
        const candidates = workflow.nodes.filter(n => n.id !== sourceId);
        let best: { id: string; dist: number } | null = null;
        for (const node of candidates) {
            const meta = NODE_REGISTRY[node.type] || { hasInputPort: true };
            if (!meta.hasInputPort) continue;
            const inputPos = getInputPortPosition(node);
            const dx = inputPos.x - end.x;
            const dy = inputPos.y - end.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 26 && (!best || dist < best.dist)) {
                best = { id: node.id, dist };
            }
        }
        return best;
    }, [workflow.nodes, getInputPortPosition]);

    const startDragConnection = useCallback((nodeId: string, port: EdgePort) => {
        const node = workflow.nodes.find(n => n.id === nodeId);
        if (!node) return;
        const start = getOutputPortPosition(node, port);
        setDraggingConnection({
            sourceNodeId: nodeId,
            port,
            start,
            end: start,
            hoverTargetNodeId: null,
            isCompatible: true,
            mismatchReason: undefined,
        });
    }, [workflow.nodes, getOutputPortPosition]);

    const updateDragConnection = useCallback((pageX: number, pageY: number) => {
        setDraggingConnection(prev => {
            if (!prev) return null;
            const end = pageToCanvas(pageX, pageY);
            const best = findClosestInputNode(prev.sourceNodeId, end);
            if (!best) {
                return {
                    ...prev,
                    end,
                    hoverTargetNodeId: null,
                    isCompatible: true,
                    mismatchReason: undefined,
                };
            }
            const compatibility = checkConnectionCompatibility(prev.sourceNodeId, best.id, prev.port);
            return {
                ...prev,
                end,
                hoverTargetNodeId: best.id,
                isCompatible: compatibility.compatible,
                mismatchReason: compatibility.reason,
            };
        });
    }, [pageToCanvas, findClosestInputNode, checkConnectionCompatibility]);

    const endDragConnection = useCallback((sourceId: string, sourcePort: EdgePort, pageX: number, pageY: number, didMove: boolean) => {
        if (!didMove) {
            setDraggingConnection(null);
            setConnectingFrom({ nodeId: sourceId, port: sourcePort });
            return;
        }

        const end = pageToCanvas(pageX, pageY);
        const best = findClosestInputNode(sourceId, end);

        if (best) {
            const compatibility = checkConnectionCompatibility(sourceId, best.id, sourcePort);
            if (compatibility.compatible) {
                addEdge(sourceId, best.id, sourcePort);
            } else {
                Alert.alert(
                    'Uyumsuz bağlantı',
                    `Bu bağlantı kurulamadı.\n${compatibility.reason || ''}`
                );
            }
        } else if (onQuickAddRequested) {
            const snappedX = Math.round(end.x / GRID_SIZE) * GRID_SIZE;
            const snappedY = Math.round(end.y / GRID_SIZE) * GRID_SIZE;
            onQuickAddRequested({
                sourceNodeId: sourceId,
                port: sourcePort,
                position: { x: snappedX, y: snappedY },
            });
        }

        setDraggingConnection(null);
    }, [pageToCanvas, findClosestInputNode, checkConnectionCompatibility, addEdge, onQuickAddRequested]);

    const handleQuickAddPress = useCallback((e: any) => {
        if (!connectingFrom || !onQuickAddRequested) return;

        const { locationX, locationY } = e.nativeEvent;
        const canvasX = (locationX - translationX.value) / scale.value;
        const canvasY = (locationY - translationY.value) / scale.value;
        const snappedX = Math.round(canvasX / GRID_SIZE) * GRID_SIZE;
        const snappedY = Math.round(canvasY / GRID_SIZE) * GRID_SIZE;

        onQuickAddRequested({
            sourceNodeId: connectingFrom.nodeId,
            port: connectingFrom.port,
            position: { x: snappedX, y: snappedY },
        });
        setConnectingFrom(null);
    }, [connectingFrom, onQuickAddRequested, translationX, translationY, scale]);

    // Menu Actions
    const handleMenuAction = async (action: 'connect' | 'edit' | 'delete' | 'copy' | 'duplicate', nodeId: string) => {
        setActiveMenuNodeId(null);
        const node = workflow.nodes.find(n => n.id === nodeId);
        if (!node) return;

        if (action === 'connect') startConnection(nodeId, 'default');
        else if (action === 'edit') onNodeSelect(node);
        else if (action === 'delete') deleteNode(nodeId);
        else if (action === 'copy') {
            await copySingleNode(node, workflow.edges);
            Alert.alert('✅ Kopyalandı', `"${NODE_REGISTRY[node.type]?.name || node.type}" panoya kopyalandı.`);
        }
        else if (action === 'duplicate') {
            const newNode = duplicateNode(node, workflow.nodes);
            onWorkflowChange({ ...workflow, nodes: [...workflow.nodes, newNode] });
        }
    };

    // Paste handler
    const handlePaste = async () => {
        const result = await pasteNodes(workflow.nodes);
        if (result && result.nodes.length > 0) {
            onWorkflowChange({
                ...workflow,
                nodes: [...workflow.nodes, ...result.nodes],
                edges: [...workflow.edges, ...result.edges]
            });
            Alert.alert('✅ Yapıştırıldı', `${result.nodes.length} node yapıştırıldı.`);
        } else {
            Alert.alert('📋 Pano Boş', 'Yapıştırılacak node bulunamadı.');
        }
    };

    const connectionSourceNode = connectingFrom
        ? workflow.nodes.find((n) => n.id === connectingFrom.nodeId) || null
        : null;
    const connectionSourceLabel = connectionSourceNode
        ? (connectionSourceNode.label || NODE_REGISTRY[connectionSourceNode.type]?.name || 'Node')
        : 'Node';

    return (
        <GestureDetector gesture={composedGesture}>
            <View
                ref={containerRef}
                style={[styles.container, { backgroundColor: colors.background }]}
                onLayout={() => {
                    if (!containerRef.current) return;
                    containerRef.current.measureInWindow((x, y) => {
                        setContainerOffset({ x, y });
                    });
                }}
            >
                <Reanimated.View style={[styles.canvasContainer, animatedStyle]}>
                    <GridBackground isDark={isDark} />

                    {connectingFrom && onQuickAddRequested && (
                        <Pressable
                            style={StyleSheet.absoluteFill}
                            onPress={handleQuickAddPress}
                        />
                    )}

                    <EdgeLines
                        edges={workflow.edges}
                        nodes={workflow.nodes}
                        onDeleteEdge={deleteEdge}
                        connectingFrom={connectingFrom}
                        draggingConnection={draggingConnection}
                        isDark={isDark}
                    />

                    {workflow.nodes.map(node => (
                        <NodeComponent
                            key={node.id}
                            node={node}
                            isSelected={node.id === selectedNodeId}
                            isConnecting={connectingFrom !== null}
                            onSelect={() => onNodeSelect(node)}
                            onMove={(dx, dy) => updateNodePosition(node.id, dx, dy)}
                            onDelete={() => deleteNode(node.id)}
                            onCompleteConnection={() => completeConnection(node.id)}
                            onOpenMenu={() => setActiveMenuNodeId(node.id)}
                            scale={scale} // Pass scale for corrected drag deltas
                            colors={colors}
                            isDark={isDark}
                        />
                    ))}

                    {/* Ports Layer - Rendered after nodes to ensure click priority */}
                    {workflow.nodes.map(node => (
                        <NodePorts
                            key={`ports-${node.id}`}
                            node={node}
                            isConnecting={connectingFrom !== null}
                            onStartConnection={(port) => startConnection(node.id, port)}
                            onCompleteConnection={() => completeConnection(node.id)}
                            onDragStart={(port) => startDragConnection(node.id, port)}
                            onDragMove={(pageX, pageY) => updateDragConnection(pageX, pageY)}
                            onDragEnd={(port, pageX, pageY, didMove) => endDragConnection(node.id, port, pageX, pageY, didMove)}
                        />
                    ))}

                    {/* Menu Overlay - Scaled properly/Inverse scaled or just kept in scene */}
                    {activeMenuNodeId && (() => {
                        const activeNode = workflow.nodes.find(n => n.id === activeMenuNodeId);
                        return activeNode ? (
                            <NodeActionMenu
                                node={activeNode}
                                onAction={(action) => handleMenuAction(action, activeMenuNodeId)}
                                onClose={() => setActiveMenuNodeId(null)}
                                colors={colors}
                            />
                        ) : null;
                    })()}
                </Reanimated.View>

                {/* Minimal Connection Mode Indicator - No overlay to block touches */}
                {connectingFrom && (
                    <View style={styles.connectionIndicator}>
                        <Text style={styles.connectionText}>
                            Connecting from "{truncateValue(connectionSourceLabel, 24)}" ({connectingFrom.port})
                        </Text>
                        <Text style={styles.connectionSubText}>
                            Tap a target input to connect, or tap empty canvas to quick-add a node.
                        </Text>
                        <TouchableOpacity onPress={cancelConnection} style={styles.cancelBtn}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {draggingConnection?.isCompatible === false && (
                    <View style={[styles.connectionIndicator, styles.connectionErrorIndicator]}>
                        <Text style={styles.connectionText}>
                            Uyumsuz bağlantı: {draggingConnection.mismatchReason || 'Veri tipi uyuşmuyor'}
                        </Text>
                    </View>
                )}

                {/* Paste Button */}
                <TouchableOpacity
                    style={[styles.pasteButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={handlePaste}
                >
                    <Ionicons name="clipboard-outline" size={20} color={colors.primary} />
                    <Text style={[styles.pasteButtonText, { color: colors.text }]}>Yapıştır</Text>
                </TouchableOpacity>

                <View style={styles.controls}>
                    <Text style={styles.controlText}>Infinite Canvas Active (Scroll + Tap)</Text>
                </View>
            </View>
        </GestureDetector>
    );
};


// ═══════════════════════════════════════════════════════════════
// SUBCOMPONENTS
// ═══════════════════════════════════════════════════════════════

const GridBackground = ({ isDark }: { isDark: boolean }) => (
    <View style={styles.gridBackground} pointerEvents="none">
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
            <Defs>
                <Pattern
                    id="grid-pattern"
                    width={GRID_SIZE}
                    height={GRID_SIZE}
                    patternUnits="userSpaceOnUse"
                >
                    <Circle cx={1} cy={1} r={1} fill={isDark ? "#333" : "#CBD5E1"} />
                </Pattern>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#grid-pattern)" />
        </Svg>
    </View>
);

// Import Defs, Pattern, Rect needed for Grid
import { Defs, Pattern, Rect } from 'react-native-svg';

interface EdgeLinesProps {
    edges: WorkflowEdge[];
    nodes: WorkflowNode[];
    onDeleteEdge: (edgeId: string) => void;
    connectingFrom: { nodeId: string; port: EdgePort } | null;
    draggingConnection?: {
        sourceNodeId: string;
        port: EdgePort;
        start: { x: number; y: number };
        end: { x: number; y: number };
        hoverTargetNodeId?: string | null;
        isCompatible?: boolean;
        mismatchReason?: string;
    } | null;
    isDark?: boolean;
}

const SimpleLines = ({ edges, nodes }) => {
    return (
        <View style={styles.edgeContainer} pointerEvents="none">
            {edges.map(edge => {
                const source = nodes.find(n => n.id === edge.sourceNodeId);
                const target = nodes.find(n => n.id === edge.targetNodeId);
                if (!source || !target) return null;

                const startX = source.position.x + NODE_WIDTH + 1000; // Offset fix
                const startY = source.position.y + (NODE_HEIGHT / 2) + 1000;
                const endX = target.position.x + 1000;
                const endY = target.position.y + (NODE_HEIGHT / 2) + 1000;

                const dx = endX - startX;
                const dy = endY - startY;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);

                return (
                    <View
                        key={edge.id}
                        style={{
                            position: 'absolute',
                            left: startX,
                            top: startY,
                            width: length,
                            height: 2,
                            backgroundColor: '#6366F1',
                            transform: [
                                { translateY: -1 }, // Center vertically
                                { rotate: `${angle}deg` },
                                { translateX: length / 2 } // Rotate around center, so shift
                            ],
                            // React Native rotation origin is center, we need to adjust logic
                            // Actually it's easier to set transformOrigin if possible, but for now:
                            // Let's use simplified approach: 
                        }}
                    />
                );
            })}
        </View>
    );
};

// Simplified Edge Lines without SVG
const EdgeLines: React.FC<EdgeLinesProps> = ({ edges, nodes, onDeleteEdge, draggingConnection, isDark }) => {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    return (
        <View style={styles.edgeContainer} pointerEvents="box-none">
            <Svg height="100%" width="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
                {edges.map(edge => {
                    const source = nodeMap.get(edge.sourceNodeId);
                    const target = nodeMap.get(edge.targetNodeId);
                    if (!source || !target) return null;

                    const startX = source.position.x + NODE_WIDTH + 20;
                    const startY = source.position.y + (NODE_HEIGHT / 2);
                    const endX = target.position.x - 20;
                    const endY = target.position.y + (NODE_HEIGHT / 2);

                    const dist = Math.abs(endX - startX);
                    const cp1x = startX + (dist * 0.5);
                    const cp1y = startY;
                    const cp2x = endX - (dist * 0.5);
                    const cp2y = endY;

                    const d = `M${startX},${startY} C${cp1x},${cp1y} ${cp2x},${cp2y} ${endX},${endY}`;

                    return (
                        <Path
                            key={edge.id}
                            d={d}
                            stroke={isDark ? "#818CF8" : "#6366F1"}
                            strokeWidth="3"
                            fill="none"
                        />
                    );
                })}

                {draggingConnection && (() => {
                    const startX = draggingConnection.start.x;
                    const startY = draggingConnection.start.y;
                    const endX = draggingConnection.end.x;
                    const endY = draggingConnection.end.y;
                    const dist = Math.abs(endX - startX);
                    const cp1x = startX + (dist * 0.5);
                    const cp1y = startY;
                    const cp2x = endX - (dist * 0.5);
                    const cp2y = endY;
                    const d = `M${startX},${startY} C${cp1x},${cp1y} ${cp2x},${cp2y} ${endX},${endY}`;

                    return (
                        <Path
                            d={d}
                            stroke={draggingConnection.isCompatible === false
                                ? (isDark ? '#F87171' : '#EF4444')
                                : (isDark ? "#34D399" : "#10B981")}
                            strokeWidth="3"
                            fill="none"
                        />
                    );
                })()}
            </Svg>

            {/* Interactive Edge Buttons Layer */}
            {edges.map(edge => {
                const source = nodeMap.get(edge.sourceNodeId);
                const target = nodeMap.get(edge.targetNodeId);
                if (!source || !target) return null;

                const startX = source.position.x + NODE_WIDTH + 20;
                const startY = source.position.y + (NODE_HEIGHT / 2);
                const endX = target.position.x - 20;
                const endY = target.position.y + (NODE_HEIGHT / 2);

                const dist = Math.abs(endX - startX);
                const cp1x = startX + (dist * 0.5);
                const cp1y = startY;
                const cp2x = endX - (dist * 0.5);
                const cp2y = endY;

                // Calculate midpoint (t=0.5)
                const midX = getBezierPoint(0.5, startX, cp1x, cp2x, endX);
                const midY = getBezierPoint(0.5, startY, cp1y, cp2y, endY);

                return (
                    <TouchableOpacity
                        key={`del-${edge.id}`}
                        style={[styles.edgeDeleteBtn, { left: midX - 12, top: midY - 12 }]}
                        onPress={() => {
                            Alert.alert('Bağı Kopar', 'Bu bağlantıyı silmek istiyor musunuz?', [
                                { text: 'İptal', style: 'cancel' },
                                { text: 'Kopar', style: 'destructive', onPress: () => onDeleteEdge(edge.id) }
                            ]);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={12} color="#FFF" />
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

interface NodeActionMenuProps {
    node: WorkflowNode;
    onAction: (action: 'connect' | 'edit' | 'delete' | 'copy' | 'duplicate') => void;
    onClose: () => void;
    colors: any;
}

const NodeActionMenu: React.FC<NodeActionMenuProps> = ({ node, onAction, onClose, colors }) => {
    return (
        <View style={[styles.menuContainer, {
            left: node.position.x + NODE_WIDTH - 20,
            top: node.position.y - 10,
            backgroundColor: colors.card,
            borderColor: colors.border
        }]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => onAction('connect')}>
                <Text style={[styles.menuItemText, { color: colors.text }]}>🔗 Bağla</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => onAction('edit')}>
                <Text style={[styles.menuItemText, { color: colors.text }]}>⚙️ Düzenle</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => onAction('copy')}>
                <Text style={[styles.menuItemText, { color: colors.text }]}>📋 Kopyala</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => onAction('duplicate')}>
                <Text style={[styles.menuItemText, { color: colors.text }]}>📑 Çoğalt</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => onAction('delete')}>
                <Text style={[styles.menuItemText, { color: '#ef4444' }]}>🗑️ Sil</Text>
            </TouchableOpacity>
        </View>
    );
};

interface NodeComponentProps {
    node: WorkflowNode;
    isSelected: boolean;
    isConnecting: boolean;
    onSelect: () => void;
    onMove: (dx: number, dy: number) => void;
    onDelete: () => void;
    onCompleteConnection: () => void;
    onOpenMenu: () => void;
    scale: SharedValue<number>;
    colors: any;
    isDark: boolean;
}

const NodeComponent: React.FC<NodeComponentProps> = ({
    node,
    isSelected,
    isConnecting,
    onSelect,
    onMove,
    onDelete,
    onCompleteConnection,
    onOpenMenu,
    scale,
    colors,
    isDark
}) => {
    const metadata = NODE_REGISTRY[node.type] || {
        type: node.type,
        category: 'processing',
        name: node.type || 'Unknown',
        description: 'Unknown Node',
        icon: '❓',
        color: '#9CA3AF',
        hasInputPort: true,
        outputPorts: ['default']
    };
    const configSummary = summarizeNodeConfig(node);
    const nodeTitle = node.label?.trim() || metadata.name;
    const nodeSubtitle = configSummary || metadata.description;

    // Refs to keep latest props accessible in PanResponder closures
    const onMoveRef = useRef(onMove);
    const onSelectRef = useRef(onSelect);
    const onCompleteConnectionRef = useRef(onCompleteConnection);
    const isConnectingRef = useRef(isConnecting);
    const scaleRef = useRef(scale);

    // Update refs when props change
    useEffect(() => { onMoveRef.current = onMove; }, [onMove]);
    useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
    useEffect(() => { onCompleteConnectionRef.current = onCompleteConnection; }, [onCompleteConnection]);
    useEffect(() => { isConnectingRef.current = isConnecting; }, [isConnecting]);
    useEffect(() => { scaleRef.current = scale; }, [scale]);

    // Legacy Animated for Drag interaction inside Reanimated context
    const pan = useRef(new RNAnimated.ValueXY()).current;
    const isDragging = useRef(false);
    const gestureStartTime = useRef(0);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                gestureStartTime.current = Date.now();
                isDragging.current = false;
                pan.setOffset({ x: 0, y: 0 });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: (_, gesture) => {
                if (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5) {
                    isDragging.current = true;
                    // Adjust visual feedback for scale
                    const zoom = scaleRef.current.value || 1;
                    pan.setValue({ x: gesture.dx / zoom, y: gesture.dy / zoom });
                }
            },
            onPanResponderRelease: (_, gesture) => {
                if (isDragging.current) {
                    // Normalize movement delta by zoom scale
                    const zoom = scaleRef.current.value || 1;
                    onMoveRef.current(gesture.dx / zoom, gesture.dy / zoom);
                } else if ((Date.now() - gestureStartTime.current) < 500) {
                    if (isConnectingRef.current) onCompleteConnectionRef.current();
                    else onSelectRef.current();
                }
                // Reset pan value immediately. Since we updated the parent state (node.position),
                // the component will re-render at the new position. We don't want any offset remaining.
                pan.setValue({ x: 0, y: 0 });
            },
        })
    ).current;

    const nodeStyle: any = {
        left: node.position.x,
        top: node.position.y,
        transform: [
            { translateX: pan.x },
            { translateY: pan.y },
        ],
    };

    return (
        <RNAnimated.View
            style={[
                styles.node,
                nodeStyle,
                isSelected && styles.nodeSelected,
                {
                    backgroundColor: isDark ? '#1E1E2E' : '#FFFFFF',
                    borderColor: isSelected ? (isDark ? '#818CF8' : '#8B5CF6') : (isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB')
                }
            ]}
            {...panResponder.panHandlers}
        >
            <View style={styles.nodeContent}>
                {/* n8n Style: Icon box on left, text on right */}
                <View style={[styles.iconBox, { backgroundColor: metadata.color }]}>
                    {/^[a-z0-9-]+$/.test(metadata.icon) ? (
                        <Ionicons name={metadata.icon as any} size={24} color="#FFF" />
                    ) : (
                        <Text style={styles.nodeIcon}>{metadata.icon}</Text>
                    )}
                </View>
                <View style={styles.textBox}>
                    <Text style={[styles.nodeTitle, { color: colors.text }]} numberOfLines={1}>{nodeTitle}</Text>
                    <Text style={[styles.nodeSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{nodeSubtitle}</Text>
                </View>

                {/* Status Indicator / Menu Trigger */}
                <TouchableOpacity
                    style={styles.nodeMenu}
                    onPress={onOpenMenu}
                >
                    <Text style={{ color: '#666', fontSize: 16 }}>⋮</Text>
                </TouchableOpacity>
            </View>
        </RNAnimated.View>
    );
};

/**
 * NodePorts - Rendered as a separate layer above nodes
 */
interface NodePortsProps {
    node: WorkflowNode;
    isConnecting: boolean;
    onStartConnection: (port: EdgePort) => void;
    onCompleteConnection: () => void;
    onDragStart?: (port: EdgePort) => void;
    onDragMove?: (pageX: number, pageY: number) => void;
    onDragEnd?: (port: EdgePort, pageX: number, pageY: number, didMove: boolean) => void;
}

const NodePorts: React.FC<NodePortsProps> = ({
    node,
    isConnecting,
    onStartConnection,
    onCompleteConnection,
    onDragStart,
    onDragMove,
    onDragEnd,
}) => {
    const metadata = NODE_REGISTRY[node.type] || { hasInputPort: true, outputPorts: ['default'] };

    return (
        <View style={[styles.portsLayer, { left: node.position.x - 20, top: node.position.y }]} pointerEvents="box-none">
            {/* Input Port (Left Center) - Büyük Hedef Butonu */}
            {metadata.hasInputPort && (
                <TouchableOpacity
                    style={[styles.port, styles.inputPort, isConnecting && styles.inputPortActive]}
                    onPress={(e) => {
                        console.log('[DEBUG] Input port pressed! isConnecting:', isConnecting, 'nodeId:', node.id);
                        e.stopPropagation();
                        if (isConnecting) {
                            console.log('[DEBUG] Calling onCompleteConnection for node:', node.id);
                            onCompleteConnection();
                        } else {
                            console.log('[DEBUG] Not connecting, ignoring input port press');
                        }
                    }}
                    hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
                    activeOpacity={0.7}
                >
                    <View style={[styles.portButton, styles.inputPortButton, isConnecting && styles.inputPortButtonActive]}>
                        <Ionicons
                            name="arrow-back"
                            size={14}
                            color={isConnecting ? '#FFFFFF' : '#4B5563'}
                        />
                    </View>
                </TouchableOpacity>
            )}

            {/* Output Ports (Right Center) - Büyük + Butonu */}
            <View style={styles.outputPortsList} pointerEvents="box-none">
                {metadata.outputPorts.map((port, index) => (
                    <TouchableOpacity
                        key={port}
                        style={[
                            styles.port,
                            styles.outputPort,
                            { top: (NODE_HEIGHT / 2) - 16 + (index * 36), right: 2 }
                        ]}
                        onPress={() => onStartConnection(port)}
                        hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
                        activeOpacity={0.7}
                        {...PanResponder.create({
                            onStartShouldSetPanResponder: () => true,
                            onMoveShouldSetPanResponder: () => true,
                            onPanResponderGrant: () => {
                                onDragStart && onDragStart(port);
                            },
                            onPanResponderMove: (_, gestureState) => {
                                const { moveX, moveY, dx, dy } = gestureState;
                                const moved = Math.abs(dx) > 6 || Math.abs(dy) > 6;
                                if (moved && onDragMove) {
                                    onDragMove(moveX, moveY);
                                }
                            },
                            onPanResponderRelease: (_, gestureState) => {
                                const { moveX, moveY, dx, dy } = gestureState;
                                const moved = Math.abs(dx) > 6 || Math.abs(dy) > 6;
                                if (onDragEnd) {
                                    onDragEnd(port, moveX, moveY, moved);
                                } else {
                                    onStartConnection(port);
                                }
                            },
                        }).panHandlers}
                    >
                        <View style={[
                            styles.portButton,
                            styles.outputPortButton,
                            port === 'true' && styles.portButtonTrue,
                            port === 'false' && styles.portButtonFalse,
                        ]}>
                            <Text style={styles.portButtonText}>
                                {port === 'true' ? 'T' : port === 'false' ? 'F' : '+'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6', // Lighter background like n8n/modern tools
        overflow: 'hidden',
    },
    canvasContainer: {
        flex: 1,
        minWidth: 1,
        minHeight: 1,
    },
    gridBackground: {
        ...StyleSheet.absoluteFillObject,
        zIndex: -1,
    },
    connectionIndicator: {
        position: 'absolute',
        bottom: 80,
        left: 20,
        right: 20,
        backgroundColor: '#1E1E2E',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(129, 140, 248, 0.45)',
        shadowColor: '#000',
        elevation: 5,
        zIndex: 50, // Below ports (200) but above other UI
    },
    connectionErrorIndicator: {
        backgroundColor: '#7F1D1D',
        bottom: 140,
    },
    connectionText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 13,
        marginBottom: 4,
    },
    connectionSubText: {
        color: '#CBD5E1',
        fontSize: 12,
        lineHeight: 16,
        paddingRight: 52,
    },
    cancelBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
    },
    cancelText: {
        color: '#EF4444',
        fontWeight: '700',
        fontSize: 12,
    },
    controls: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
    controlText: { color: '#4B5563', fontSize: 12 },

    // Paste Button
    pasteButton: {
        position: 'absolute',
        bottom: 80,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    pasteButtonText: {
        fontWeight: '600',
        fontSize: 14,
    },

    // Edge Delete Button
    edgeDeleteBtn: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100, // Above lines, below nodes (nodes are zIndex 10, but in Reanimated View context... need to check)
        borderWidth: 1,
        borderColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 2,
    },

    // n8n Style Node
    node: {
        position: 'absolute',
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    nodeSelected: {
        borderColor: '#8B5CF6',
        borderWidth: 2,
        shadowColor: '#8B5CF6',
        shadowOpacity: 0.3,
    },
    nodeContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 6,
        gap: 8,
    },
    iconBox: {
        width: 40,
        height: 60, // Full height of content area roughly
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nodeIcon: {
        fontSize: 24,
    },
    textBox: {
        flex: 1,
        justifyContent: 'center',
    },
    nodeTitle: {
        color: '#111827',
        fontSize: 13,
        fontWeight: '700',
    },
    nodeSubtitle: {
        color: '#6B7280',
        fontSize: 10,
        marginTop: 2,
    },
    nodeMenu: {
        padding: 4,
        justifyContent: 'center',
    },

    // Ports Layer - Extended to capture touches outside node bounds
    portsLayer: {
        position: 'absolute',
        width: NODE_WIDTH + 40, // +20px left, +20px right for ports
        height: NODE_HEIGHT,
        zIndex: 200, // FIX: Higher than connectionOverlay (100) to ensure clickability
        // overflow: 'visible' does not work on Android for touch events
    },
    port: {
        position: 'absolute',
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 201,
        elevation: 10,
    },
    inputPort: {
        left: 2, // Was -18, now relative to wider portsLayer (20 - 18 = 2)
        top: '50%',
        marginTop: -18,
    },
    inputPortActive: {
        transform: [{ scale: 1.2 }],
    },
    outputPort: {
        right: 2, // Was -18, now relative to wider portsLayer
    },
    outputPortsList: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 201,
    },
    // Büyük Port Butonları
    portButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    inputPortButton: {
        backgroundColor: '#E2E8F0',
        borderWidth: 2,
        borderColor: '#94A3B8',
    },
    inputPortButtonActive: {
        backgroundColor: '#10B981',
        borderColor: '#059669',
    },
    outputPortButton: {
        backgroundColor: '#4F46E5',
        borderWidth: 2,
        borderColor: '#4338CA',
    },
    portButtonTrue: {
        backgroundColor: '#10B981',
        borderColor: '#059669',
    },
    portButtonFalse: {
        backgroundColor: '#EF4444',
        borderColor: '#DC2626',
    },
    portButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: 'bold',
        lineHeight: 14,
    },
    portButtonTextActive: {
        color: '#FFFFFF',
    },
    // Legacy port styles (backup)
    portDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FFFFFF',
        borderWidth: 3,
        borderColor: '#6B7280',
    },
    outputDot: {
        borderColor: '#4F46E5',
    },
    portTrue: { borderColor: '#10B981' },
    portFalse: { borderColor: '#EF4444' },

    edgeContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
        pointerEvents: 'none',
    },
    menuContainer: {
        position: 'absolute',
        backgroundColor: '#1E1E2E',
        borderRadius: 12,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        zIndex: 999,
        minWidth: 140,
        borderColor: '#2A2A4A',
        borderWidth: 1,
    },
    menuItem: {
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    menuItemText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '500',
    },
    menuDivider: {
        height: 1,
        backgroundColor: '#2A2A4A',
        marginVertical: 4,
    },
});

export default WorkflowCanvas;
