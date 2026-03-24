import { useEffect, useMemo, useState } from 'react';

function getApiBaseUrl() {
    if (typeof window === 'undefined') {
        return '';
    }
    const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    if (configuredApiBaseUrl) {
        return configuredApiBaseUrl;
    }
    const apiPort = import.meta.env.VITE_API_PORT || '4000';
    if (window.location.port && window.location.port !== apiPort) {
        return `${window.location.protocol}//${window.location.hostname}:${apiPort}`;
    }
    return '';
}

async function parseJsonResponse(response) {
    const responseText = await response.text();
    let payload = {};
    try {
        payload = responseText ? JSON.parse(responseText) : {};
    } catch (_error) {
        throw new Error('API가 JSON 대신 HTML을 반환했습니다. 개발 서버와 API 서버 포트를 확인하세요.');
    }
    return payload;
}

export function useTasks() {
    const [taskItems, setTaskItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const apiBaseUrl = getApiBaseUrl();

    useEffect(() => {
        let isDisposed = false;

        async function fetchRuns() {
            try {
                const response = await fetch(`${apiBaseUrl}/api/run`);
                const payload = await parseJsonResponse(response);
                if (!response.ok) {
                    throw new Error(payload?.error || '요청 처리에 실패했습니다.');
                }
                if (!isDisposed) {
                    setTaskItems(payload.runs || []);
                }
            } catch (error) {
                if (!isDisposed) {
                    console.error(error);
                }
            } finally {
                if (!isDisposed) {
                    setIsLoading(false);
                }
            }
        }

        fetchRuns();

        return () => {
            isDisposed = true;
        };
    }, [apiBaseUrl]);

    const taskCount = useMemo(() => taskItems.length, [taskItems.length]);

    const prependTask = async ({ title, promptText = '', attachments = [] }) => {
        const normalizedTaskTitle = title.trim();
        if (!normalizedTaskTitle) {
            return null;
        }

        const response = await fetch(`${apiBaseUrl}/api/run`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                promptText,
                attachments: attachments.map((attachmentItem) => ({
                    id: attachmentItem.id,
                    tag: attachmentItem.tag,
                    type: attachmentItem.type,
                    name: attachmentItem.file.name,
                    thumbnailUrl: attachmentItem.thumbnailUrl
                }))
            })
        });

        const payload = await parseJsonResponse(response);
        if (payload.task) {
            setTaskItems((currentTaskItems) => [payload.task, ...currentTaskItems.filter((taskItem) => taskItem.id !== payload.task.id)]);
        }

        if (!response.ok) {
            throw new Error(payload?.error || '작업 생성에 실패했습니다.');
        }

        return payload.task;
    };

    return { taskItems, taskCount, prependTask, isLoading };
}
