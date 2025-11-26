import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import Svg, { G, Rect, Line as SvgLine, Text as SvgText, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const MilestoneDashboard = () => {
    const [milestones, setMilestones] = useState([]);
    const [selectedStream, setSelectedStream] = useState('all');
    const [selectedMilestone, setSelectedMilestone] = useState(null);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [refreshInterval] = useState(30000); // 30 seconds

    const developmentStreams = {
        'security_remediation': 'Security Remediation Stream',
        'frontend_auth_migration': 'Frontend Authentication Migration',
        'data_migration': 'Data Migration Stream',
        'realtime_features': 'Real-time Features Stream',
        'integration_testing': 'Integration Testing Stream',
        'performance_optimization': 'Performance Optimization Stream'
    };

    useEffect(() => {
        loadDashboardData();
        const interval = setInterval(loadDashboardData, refreshInterval);
        return () => clearInterval(interval);
    }, [selectedStream, refreshInterval, loadDashboardData]);

    const loadDashboardData = useCallback(async () => {
        try {
            // Load milestones with current filters
            const milestonesResponse = await fetch(`/api/milestones?streamType=${selectedStream === 'all' ? '' : selectedStream}&limit=100`);
            const milestonesData = await milestonesResponse.json();

            if (milestonesData.success) {
                setMilestones(milestonesData.data);
            }

            // Load dashboard statistics
            const statsResponse = await fetch(`/api/milestones/stats/overview?streamType=${selectedStream === 'all' ? '' : selectedStream}`);
            const statsData = await statsResponse.json();

            if (statsData.success) {
                setDashboardStats(statsData.data);
            }

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }, [selectedStream]);

    const getStatusBadge = (status) => {
        const variants = {
            'not_started': { bgColor: '#6c757d', textColor: '#ffffff' },
            'in_progress': { bgColor: '#007bff', textColor: '#ffffff' },
            'in_review': { bgColor: '#ffc107', textColor: '#000000' },
            'completed': { bgColor: '#28a745', textColor: '#ffffff' },
            'blocked': { bgColor: '#dc3545', textColor: '#ffffff' },
            'delayed': { bgColor: '#ffc107', textColor: '#000000' }
        };

        const variant = variants[status] || variants['not_started'];
        return (
            <View style={{
                backgroundColor: variant.bgColor,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                margin: 2
            }}>
                <Text style={{ color: variant.textColor, fontSize: 12, fontWeight: 'bold' }}>
                    {status.replace('_', ' ')}
                </Text>
            </View>
        );
    };

    const getPriorityBadge = (priority) => {
        const variants = {
            'low': { bgColor: '#28a745', textColor: '#ffffff' },
            'medium': { bgColor: '#ffc107', textColor: '#000000' },
            'high': { bgColor: '#dc3545', textColor: '#ffffff' },
            'critical': { bgColor: '#212529', textColor: '#ffffff' }
        };

        const variant = variants[priority] || variants['low'];
        return (
            <View style={{
                backgroundColor: variant.bgColor,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                margin: 2
            }}>
                <Text style={{ color: variant.textColor, fontSize: 12, fontWeight: 'bold' }}>
                    {priority}
                </Text>
            </View>
        );
    };

    const getProgressColor = (percentage) => {
        if (percentage >= 90) return '#28a745';
        if (percentage >= 70) return '#17a2b8';
        if (percentage >= 50) return '#ffc107';
        return '#dc3545';
    };

    const renderProgressChart = () => {
        if (!dashboardStats) return null;

        const width = 200;
        const height = 200;
        const radius = Math.min(width, height) / 2 - 10;
        const centerX = width / 2;
        const centerY = height / 2;

        const total = dashboardStats.completed + dashboardStats.inProgress + dashboardStats.blocked +
            (dashboardStats.total - dashboardStats.completed - dashboardStats.inProgress - dashboardStats.blocked);

        const segments = [
            { value: dashboardStats.completed, color: '#28a745', label: 'Completed' },
            { value: dashboardStats.inProgress, color: '#007bff', label: 'In Progress' },
            { value: dashboardStats.blocked, color: '#dc3545', label: 'Blocked' },
            { value: dashboardStats.total - dashboardStats.completed - dashboardStats.inProgress - dashboardStats.blocked, color: '#6c757d', label: 'Not Started' }
        ];

        let currentAngle = 0;
        const chartElements = segments.map((segment, index) => {
            if (segment.value === 0) return null;

            const angle = (segment.value / total) * 2 * Math.PI;
            const x1 = centerX + radius * Math.cos(currentAngle);
            const y1 = centerY + radius * Math.sin(currentAngle);
            const x2 = centerX + radius * Math.cos(currentAngle + angle);
            const y2 = centerY + radius * Math.sin(currentAngle + angle);

            const largeArcFlag = angle > Math.PI ? 1 : 0;

            const pathData = [
                `M ${centerX} ${centerY}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
            ].join(' ');

            const textAngle = currentAngle + angle / 2;
            const textX = centerX + (radius * 0.7) * Math.cos(textAngle);
            const textY = centerY + (radius * 0.7) * Math.sin(textAngle);

            currentAngle += angle;

            return (
                <G key={index}>
                    <Path d={pathData} fill={segment.color} />
                    <SvgText
                        x={textX}
                        y={textY}
                        fill="white"
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                    >
                        {Math.round((segment.value / total) * 100)}%
                    </SvgText>
                </G>
            );
        });

        return (
            <View style={{ alignItems: 'center', padding: 16 }}>
                <Svg width={width} height={height}>
                    {chartElements}
                </Svg>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 16 }}>
                    {segments.map((segment, index) => (
                        <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 4 }}>
                            <View style={{ width: 12, height: 12, backgroundColor: segment.color, borderRadius: 2, marginRight: 4 }} />
                            <Text style={{ fontSize: 10, color: '#6c757d' }}>{segment.label}</Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const renderStreamProgress = () => {
        const streamProgress = Object.keys(developmentStreams).map(stream => {
            const streamMilestones = milestones.filter(m => m.streamType === stream);
            const avgProgress = streamMilestones.length > 0
                ? streamMilestones.reduce((sum, m) => sum + m.progressPercentage, 0) / streamMilestones.length
                : 0;

            return {
                stream,
                name: developmentStreams[stream].split(' ')[0], // Shortened name for space
                count: streamMilestones.length,
                avgProgress
            };
        });

        const width = 300;
        const height = 200;
        const padding = 40;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;

        const barWidth = chartWidth / streamProgress.length * 0.8;
        const spacing = chartWidth / streamProgress.length * 0.2;

        const bars = streamProgress.map((item, index) => {
            const barHeight = (item.avgProgress / 100) * chartHeight;
            const x = padding + index * (chartWidth / streamProgress.length) + spacing / 2;
            const y = height - padding - barHeight;

            return (
                <G key={index}>
                    <Rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        fill="#007bff"
                        rx={2}
                    />
                    <SvgText
                        x={x + barWidth / 2}
                        y={height - padding + 15}
                        fill="#6c757d"
                        fontSize="8"
                        textAnchor="middle"
                    >
                        {item.name}
                    </SvgText>
                    <SvgText
                        x={x + barWidth / 2}
                        y={y - 5}
                        fill="#212529"
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                    >
                        {Math.round(item.avgProgress)}%
                    </SvgText>
                </G>
            );
        });

        // Y-axis
        const yAxisLines = [0, 25, 50, 75, 100].map(percentage => {
            const y = height - padding - (percentage / 100) * chartHeight;
            return (
                <G key={percentage}>
                    <SvgLine
                        x1={padding - 5}
                        y1={y}
                        x2={width - padding + 5}
                        y2={y}
                        stroke="#e9ecef"
                        strokeWidth={1}
                    />
                    <SvgText
                        x={padding - 10}
                        y={y}
                        fill="#6c757d"
                        fontSize="8"
                        textAnchor="end"
                        alignmentBaseline="middle"
                    >
                        {percentage}%
                    </SvgText>
                </G>
            );
        });

        return (
            <View style={{ alignItems: 'center', padding: 16 }}>
                <Svg width={width} height={height}>
                    {yAxisLines}
                    {bars}
                </Svg>
            </View>
        );
    };

    const renderTimelineChart = () => {
        const timelineData = milestones
            .sort((a, b) => new Date(a.estimatedEndDate) - new Date(b.estimatedEndDate))
            .slice(0, 6) // Show fewer items for better mobile display
            .map(milestone => {
                const startDate = new Date(milestone.estimatedStartDate);
                const endDate = new Date(milestone.estimatedEndDate);

                return {
                    name: milestone.title.length > 15 ? milestone.title.substring(0, 15) + '...' : milestone.title,
                    start: startDate.getTime(),
                    end: endDate.getTime(),
                    progress: milestone.progressPercentage,
                    status: milestone.status
                };
            });

        if (timelineData.length === 0) return null;

        const width = 350;
        const height = 200;
        const padding = 60;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;

        const minTime = Math.min(...timelineData.map(item => item.start));
        const maxTime = Math.max(...timelineData.map(item => item.end));
        const timeRange = maxTime - minTime;

        const bars = timelineData.map((item, index) => {
            const barWidth = 20;
            const x = padding + (index * chartWidth) / timelineData.length + 10;
            const startY = height - padding - chartHeight * 0.3;
            const endY = height - padding - chartHeight * 0.7;
            const progressY = height - padding - (item.progress / 100) * chartHeight * 0.7;

            const getStatusColor = (status) => {
                const colors = {
                    'completed': '#28a745',
                    'in_progress': '#007bff',
                    'blocked': '#dc3545',
                    'not_started': '#6c757d'
                };
                return colors[status] || '#6c757d';
            };

            return (
                <G key={index}>
                    {/* Start date line */}
                    <SvgLine
                        x1={x}
                        y1={startY}
                        x2={x}
                        y2={endY}
                        stroke="#007bff"
                        strokeWidth={2}
                    />
                    {/* Progress line */}
                    <SvgLine
                        x1={x}
                        y1={endY}
                        x2={x}
                        y2={progressY}
                        stroke={getStatusColor(item.status)}
                        strokeWidth={4}
                    />
                    {/* Milestone name */}
                    <SvgText
                        x={x}
                        y={height - padding + 15}
                        fill="#6c757d"
                        fontSize="8"
                        textAnchor="middle"
                    >
                        {item.name}
                    </SvgText>
                    {/* Progress percentage */}
                    <SvgText
                        x={x + 15}
                        y={progressY}
                        fill="#212529"
                        fontSize="8"
                        fontWeight="bold"
                    >
                        {Math.round(item.progress)}%
                    </SvgText>
                </G>
            );
        });

        // Timeline axis
        const axisLines = [0, 25, 50, 75, 100].map(percentage => {
            const y = height - padding - (percentage / 100) * chartHeight * 0.7;
            return (
                <SvgLine
                    key={percentage}
                    x1={padding - 5}
                    y1={y}
                    x2={width - padding + 5}
                    y2={y}
                    stroke="#e9ecef"
                    strokeWidth={1}
                />
            );
        });

        return (
            <View style={{ alignItems: 'center', padding: 16 }}>
                <Svg width={width} height={height}>
                    {axisLines}
                    {bars}
                </Svg>
            </View>
        );
    };

    const renderMilestoneTable = () => {
        return (
            <View style={{ marginBottom: 16 }}>
                {/* Table Header */}
                <View style={{
                    flexDirection: 'row',
                    backgroundColor: '#f8f9fa',
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: '#dee2e6'
                }}>
                    <Text style={{ flex: 2, fontWeight: 'bold', fontSize: 12 }}>Milestone</Text>
                    <Text style={{ flex: 1, fontWeight: 'bold', fontSize: 12 }}>Stream</Text>
                    <Text style={{ flex: 1, fontWeight: 'bold', fontSize: 12 }}>Status</Text>
                    <Text style={{ flex: 0.8, fontWeight: 'bold', fontSize: 12 }}>Priority</Text>
                    <Text style={{ flex: 1, fontWeight: 'bold', fontSize: 12 }}>Progress</Text>
                    <Text style={{ flex: 1, fontWeight: 'bold', fontSize: 12 }}>Team</Text>
                    <Text style={{ flex: 1, fontWeight: 'bold', fontSize: 12 }}>End Date</Text>
                    <Text style={{ flex: 0.8, fontWeight: 'bold', fontSize: 12 }}>Actions</Text>
                </View>

                {/* Table Rows */}
                {milestones.map(milestone => (
                    <View key={milestone.id} style={{
                        flexDirection: 'row',
                        paddingVertical: 12,
                        paddingHorizontal: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: '#e9ecef'
                    }}>
                        <View style={{ flex: 2, justifyContent: 'center' }}>
                            <Text style={{ fontWeight: 'bold', fontSize: 12 }}>{milestone.title}</Text>
                            <Text style={{ color: '#6c757d', fontSize: 10 }}>
                                {milestone.description.substring(0, 50)}...
                            </Text>
                        </View>
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                            <Text style={{ fontSize: 11 }}>{developmentStreams[milestone.streamType]}</Text>
                        </View>
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                            {getStatusBadge(milestone.status)}
                        </View>
                        <View style={{ flex: 0.8, justifyContent: 'center' }}>
                            {getPriorityBadge(milestone.priority)}
                        </View>
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                            <View style={{
                                height: 8,
                                backgroundColor: '#e9ecef',
                                borderRadius: 4,
                                marginBottom: 4
                            }}>
                                <View
                                    style={{
                                        height: '100%',
                                        width: `${milestone.progressPercentage}%`,
                                        backgroundColor: getProgressColor(milestone.progressPercentage),
                                        borderRadius: 4
                                    }}
                                />
                            </View>
                            <Text style={{ fontSize: 10 }}>{milestone.progressPercentage}%</Text>
                        </View>
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                            <Text style={{ fontSize: 11 }}>{milestone.assignedTeam}</Text>
                        </View>
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                            <Text style={{ fontSize: 11 }}>
                                {new Date(milestone.estimatedEndDate).toLocaleDateString()}
                            </Text>
                        </View>
                        <View style={{ flex: 0.8, justifyContent: 'center' }}>
                            <TouchableOpacity
                                style={{
                                    backgroundColor: '#007bff',
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 4
                                }}
                                onPress={() => {
                                    setSelectedMilestone(milestone);
                                    setShowProgressModal(true);
                                }}
                            >
                                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                                    Update
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    const renderRiskMatrix = () => {
        const riskData = milestones.reduce((acc, milestone) => {
            const riskLevel = milestone.riskLevel || 'low';
            if (!acc[riskLevel]) acc[riskLevel] = 0;
            acc[riskLevel]++;
            return acc;
        }, {});

        const riskLabels = {
            'low': 'Low Risk',
            'medium': 'Medium Risk',
            'high': 'High Risk',
            'critical': 'Critical Risk'
        };

        const riskColors = {
            'low': '#28a745',
            'medium': '#ffc107',
            'high': '#fd7e14',
            'critical': '#dc3545'
        };

        const width = 200;
        const height = 200;
        const radius = Math.min(width, height) / 2 - 10;
        const centerX = width / 2;
        const centerY = height / 2;

        const total = Object.values(riskData).reduce((sum, val) => sum + val, 0);
        if (total === 0) return <Text style={{ padding: 20, textAlign: 'center' }}>No risk data available</Text>;

        const segments = Object.keys(riskData).map(level => ({
            value: riskData[level],
            color: riskColors[level] || '#6c757d',
            label: riskLabels[level] || level
        }));

        let currentAngle = 0;
        const chartElements = segments.map((segment, index) => {
            if (segment.value === 0) return null;

            const angle = (segment.value / total) * 2 * Math.PI;
            const x1 = centerX + radius * Math.cos(currentAngle);
            const y1 = centerY + radius * Math.sin(currentAngle);
            const x2 = centerX + radius * Math.cos(currentAngle + angle);
            const y2 = centerY + radius * Math.sin(currentAngle + angle);

            const largeArcFlag = angle > Math.PI ? 1 : 0;

            const pathData = [
                `M ${centerX} ${centerY}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
            ].join(' ');

            const textAngle = currentAngle + angle / 2;
            const textX = centerX + (radius * 0.7) * Math.cos(textAngle);
            const textY = centerY + (radius * 0.7) * Math.sin(textAngle);

            currentAngle += angle;

            return (
                <G key={index}>
                    <Path d={pathData} fill={segment.color} />
                    <SvgText
                        x={textX}
                        y={textY}
                        fill="white"
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                    >
                        {Math.round((segment.value / total) * 100)}%
                    </SvgText>
                </G>
            );
        });

        return (
            <View style={{ alignItems: 'center', padding: 16 }}>
                <Svg width={width} height={height}>
                    {chartElements}
                </Svg>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 16 }}>
                    {segments.map((segment, index) => (
                        <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 4 }}>
                            <View style={{ width: 12, height: 12, backgroundColor: segment.color, borderRadius: 2, marginRight: 4 }} />
                            <Text style={{ fontSize: 10, color: '#6c757d' }}>{segment.label}</Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#f8f9fa', padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#212529' }}>
                        Milestone Tracking Dashboard
                    </Text>
                    <Text style={{ fontSize: 14, color: '#6c757d', marginTop: 4 }}>
                        Real-time monitoring across all 6 parallel development streams
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput
                        style={{
                            backgroundColor: 'white',
                            borderWidth: 1,
                            borderColor: '#ced4da',
                            borderRadius: 4,
                            paddingHorizontal: 8,
                            paddingVertical: 6,
                            marginRight: 8,
                            fontSize: 14,
                            minWidth: 120
                        }}
                        value={selectedStream}
                        onChangeText={(text) => setSelectedStream(text)}
                        placeholder="Select Stream"
                    />
                    <TouchableOpacity
                        style={{
                            backgroundColor: '#007bff',
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 4
                        }}
                        onPress={loadDashboardData}
                    >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>Refresh</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {dashboardStats && (
                <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                    <View style={{ flex: 1, margin: 4 }}>
                        <View style={{
                            backgroundColor: 'white',
                            padding: 16,
                            borderRadius: 8,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 3.84,
                            elevation: 5,
                            alignItems: 'center'
                        }}>
                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#212529' }}>
                                {dashboardStats.total}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>
                                Total Milestones
                            </Text>
                        </View>
                    </View>
                    <View style={{ flex: 1, margin: 4 }}>
                        <View style={{
                            backgroundColor: 'white',
                            padding: 16,
                            borderRadius: 8,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 3.84,
                            elevation: 5,
                            alignItems: 'center'
                        }}>
                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#28a745' }}>
                                {dashboardStats.completed}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>
                                Completed
                            </Text>
                        </View>
                    </View>
                    <View style={{ flex: 1, margin: 4 }}>
                        <View style={{
                            backgroundColor: 'white',
                            padding: 16,
                            borderRadius: 8,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 3.84,
                            elevation: 5,
                            alignItems: 'center'
                        }}>
                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#ffc107' }}>
                                {dashboardStats.inProgress}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>
                                In Progress
                            </Text>
                        </View>
                    </View>
                    <View style={{ flex: 1, margin: 4 }}>
                        <View style={{
                            backgroundColor: 'white',
                            padding: 16,
                            borderRadius: 8,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 3.84,
                            elevation: 5,
                            alignItems: 'center'
                        }}>
                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#17a2b8' }}>
                                {dashboardStats.completionRate}%
                            </Text>
                            <Text style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>
                                Completion Rate
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                <View style={{ flex: 1, margin: 4 }}>
                    <View style={{
                        backgroundColor: 'white',
                        borderRadius: 8,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 3.84,
                        elevation: 5
                    }}>
                        <View style={{
                            padding: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: '#e9ecef'
                        }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#212529' }}>
                                Overall Progress Distribution
                            </Text>
                        </View>
                        <View style={{ padding: 16 }}>
                            {renderProgressChart()}
                        </View>
                    </View>
                </View>
                <View style={{ flex: 1, margin: 4 }}>
                    <View style={{
                        backgroundColor: 'white',
                        borderRadius: 8,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 3.84,
                        elevation: 5
                    }}>
                        <View style={{
                            padding: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: '#e9ecef'
                        }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#212529' }}>
                                Risk Level Distribution
                            </Text>
                        </View>
                        <View style={{ padding: 16 }}>
                            {renderRiskMatrix()}
                        </View>
                    </View>
                </View>
            </View>

            <View style={{ marginBottom: 16 }}>
                <View style={{
                    backgroundColor: 'white',
                    borderRadius: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3.84,
                    elevation: 5
                }}>
                    <View style={{
                        padding: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: '#e9ecef'
                    }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#212529' }}>
                            Stream Progress Comparison
                        </Text>
                    </View>
                    <View style={{ padding: 16 }}>
                        {renderStreamProgress()}
                    </View>
                </View>
            </View>

            <View style={{ marginBottom: 16 }}>
                <View style={{
                    backgroundColor: 'white',
                    borderRadius: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3.84,
                    elevation: 5
                }}>
                    <View style={{
                        padding: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: '#e9ecef'
                    }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#212529' }}>
                            Milestone Details
                        </Text>
                    </View>
                    <View style={{ padding: 16 }}>
                        {renderMilestoneTable()}
                    </View>
                </View>
            </View>

            <Modal
                visible={showProgressModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowProgressModal(false)}
            >
                <View style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)'
                }}>
                    <View style={{
                        backgroundColor: 'white',
                        borderRadius: 8,
                        padding: 20,
                        width: '90%',
                        maxHeight: '80%'
                    }}>
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 16
                        }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
                                Update Milestone Progress
                            </Text>
                            <TouchableOpacity onPress={() => setShowProgressModal(false)}>
                                <Ionicons name="close" size={24} color="#6c757d" />
                            </TouchableOpacity>
                        </View>

                        {selectedMilestone && (
                            <MilestoneProgressForm
                                milestone={selectedMilestone}
                                onUpdate={() => {
                                    loadDashboardData();
                                    setShowProgressModal(false);
                                }}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

const MilestoneProgressForm = ({ milestone, onUpdate }) => {
    const [progress, setProgress] = useState(milestone.progressPercentage);
    const [notes, setNotes] = useState('');
    const [teamMember, setTeamMember] = useState('');
    const [completedTasks, setCompletedTasks] = useState('');
    const [remainingTasks, setRemainingTasks] = useState('');
    const [blockers, setBlockers] = useState('');

    const handleSubmit = async () => {
        try {
            const progressData = {
                progressPercentage: progress,
                notes,
                teamMember,
                completedTasks: completedTasks.split('\n').filter(t => t.trim()),
                remainingTasks: remainingTasks.split('\n').filter(t => t.trim()),
                blockers: blockers.split('\n').filter(b => b.trim())
            };

            const response = await fetch(`/api/milestones/${milestone.id}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(progressData)
            });

            if (response.ok) {
                onUpdate();
            }
        } catch (error) {
            console.error('Error updating progress:', error);
        }
    };

    return (
        <ScrollView style={{ flex: 1 }}>
            <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#212529' }}>
                    Progress Percentage: {progress}%
                </Text>
                <View style={{
                    height: 8,
                    backgroundColor: '#e9ecef',
                    borderRadius: 4,
                    marginBottom: 8
                }}>
                    <View
                        style={{
                            height: '100%',
                            width: `${progress}%`,
                            backgroundColor: '#007bff',
                            borderRadius: 4
                        }}
                    />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                    <TouchableOpacity
                        onPress={() => setProgress(Math.max(0, progress - 10))}
                        style={{
                            backgroundColor: '#dc3545',
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 4,
                            marginRight: 8
                        }}
                    >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>-10%</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setProgress(Math.min(100, progress + 10))}
                        style={{
                            backgroundColor: '#28a745',
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 4
                        }}
                    >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>+10%</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#212529' }}>
                        Team Member
                    </Text>
                    <TextInput
                        style={{
                            backgroundColor: 'white',
                            borderWidth: 1,
                            borderColor: '#ced4da',
                            borderRadius: 4,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            fontSize: 14
                        }}
                        value={teamMember}
                        onChangeText={setTeamMember}
                        placeholder="Enter team member name"
                    />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#212529' }}>
                        Current Tasks
                    </Text>
                    <TextInput
                        style={{
                            backgroundColor: 'white',
                            borderWidth: 1,
                            borderColor: '#ced4da',
                            borderRadius: 4,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            fontSize: 14,
                            height: 60,
                            textAlignVertical: 'top'
                        }}
                        value={remainingTasks}
                        onChangeText={setRemainingTasks}
                        placeholder="One task per line"
                        multiline
                    />
                </View>
            </View>

            <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#212529' }}>
                    Completed Tasks
                </Text>
                <TextInput
                    style={{
                        backgroundColor: 'white',
                        borderWidth: 1,
                        borderColor: '#ced4da',
                        borderRadius: 4,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 14,
                        height: 80,
                        textAlignVertical: 'top'
                    }}
                    value={completedTasks}
                    onChangeText={setCompletedTasks}
                    placeholder="One completed task per line"
                    multiline
                />
            </View>

            <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#212529' }}>
                    Blockers
                </Text>
                <TextInput
                    style={{
                        backgroundColor: 'white',
                        borderWidth: 1,
                        borderColor: '#ced4da',
                        borderRadius: 4,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 14,
                        height: 60,
                        textAlignVertical: 'top'
                    }}
                    value={blockers}
                    onChangeText={setBlockers}
                    placeholder="One blocker per line (if any)"
                    multiline
                />
            </View>

            <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#212529' }}>
                    Notes
                </Text>
                <TextInput
                    style={{
                        backgroundColor: 'white',
                        borderWidth: 1,
                        borderColor: '#ced4da',
                        borderRadius: 4,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 14,
                        height: 100,
                        textAlignVertical: 'top'
                    }}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Additional notes and observations"
                    multiline
                />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <TouchableOpacity
                    style={{
                        backgroundColor: '#6c757d',
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 4,
                        marginRight: 8
                    }}
                    onPress={onUpdate}
                >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{
                        backgroundColor: '#007bff',
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 4
                    }}
                    onPress={handleSubmit}
                >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Update Progress</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

export default MilestoneDashboard;