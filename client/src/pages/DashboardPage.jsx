import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Tabs from '../components/layout/Tabs';
import Composer from '../components/input/Composer';
import TaskList from '../components/task/TaskList';
import EmptyState from '../components/task/EmptyState';
import { useTasks } from '../hooks/useTasks';
import { useTasksMock } from '../hooks/useTasksMock';
import { useAttachments } from '../hooks/useAttachments';
import { useTagChips } from '../hooks/useTagChips';
import { parseChipsToText } from '../utils/parseChipsToText';
import DebugToolbar from '../debug/DebugToolbar';
export default function DashboardPage({ dataMode }) {
    const navigate = useNavigate();
    const [selectedTab, setSelectedTab] = useState('tasks');
    const [editorPlainText, setEditorPlainText] = useState('');
    const [submitError, setSubmitError] = useState('');
    const editorElementRef = useRef(null);
    const productionTaskDataSource = useTasks();
    const debugTaskDataSource = useTasksMock();
    const taskDataSource = dataMode === 'debug' ? debugTaskDataSource : productionTaskDataSource;
    const { taskItems, taskCount, prependTask } = taskDataSource;
    const { attachmentItems, addFiles, removeAttachmentById, clearAttachments, fallbackIcon } = useAttachments();
    const { autocompleteState, candidates, refreshAutocomplete, closeAutocomplete, moveSelection, insertChip } = useTagChips(attachmentItems);
    const isSendEnabled = editorPlainText.length > 0 || attachmentItems.length > 0;
    const syncEditorText = () => {
        setEditorPlainText(parseChipsToText(editorElementRef.current));
    };
    const handleSelectCandidate = (attachmentItem) => {
        insertChip(editorElementRef.current, attachmentItem);
        syncEditorText();
    };
    const handleSend = async () => {
        if (!isSendEnabled) {
            return;
        }
        const sendText = parseChipsToText(editorElementRef.current);
        try {
            setSubmitError('');
            const createdTask = await prependTask({
                title: sendText || '새로운 크리에이티브 요청',
                promptText: sendText,
                attachments: attachmentItems
            });
            if (editorElementRef.current) {
                editorElementRef.current.innerHTML = '';
                editorElementRef.current.focus();
            }
            clearAttachments();
            closeAutocomplete();
            setEditorPlainText('');
            if (createdTask && dataMode !== 'debug') {
                navigate(`/run/${createdTask.id}`, { state: { taskItem: createdTask } });
            }
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : '작업 생성에 실패했습니다.');
        }
    };
    const handleEditorInput = () => {
        refreshAutocomplete(editorElementRef.current);
        syncEditorText();
    };
    const handleEditorKeyDown = (event) => {
        if (event.altKey && event.key === 'Enter') {
            event.preventDefault();
            handleSend();
            return;
        }
        if (!autocompleteState.isOpen) {
            return;
        }
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            moveSelection('down');
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            moveSelection('up');
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            const selectedCandidate = candidates[autocompleteState.selectedIndex];
            if (selectedCandidate) {
                handleSelectCandidate(selectedCandidate);
            }
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            closeAutocomplete();
        }
    };
    const handleAddDebugTask = (status) => {
        if (dataMode !== 'debug') {
            return;
        }
        debugTaskDataSource.appendTaskByStatus(status);
    };
    const handleResetDebugTasks = () => {
        if (dataMode !== 'debug') {
            return;
        }
        debugTaskDataSource.resetTaskItems();
    };
    return (<>
      <Header />
      <main>
        <h1 className="hero-title">어떤 밈을 크리에이티브로 만들까요?</h1>
        {dataMode === 'debug' ? <DebugToolbar onAddTask={handleAddDebugTask} onResetTasks={handleResetDebugTasks}/> : null}
        <Composer attachments={attachmentItems} fallbackImageIcon={fallbackIcon.image} isSendEnabled={isSendEnabled} autocompleteOpen={autocompleteState.isOpen} selectedAutocompleteIndex={autocompleteState.selectedIndex} autocompleteCandidates={candidates} onAttachFiles={addFiles} onRemoveAttachment={removeAttachmentById} onSend={handleSend} onEditorInput={handleEditorInput} onEditorKeyDown={handleEditorKeyDown} onSelectAutocompleteCandidate={handleSelectCandidate} editorRef={editorElementRef}/>
        {submitError ? <p className="run-error-inline">{submitError}</p> : null}

        <Tabs selectedTab={selectedTab} taskCount={taskCount} onChangeTab={setSelectedTab}/>

        <section className="tab-panel">
          {selectedTab === 'tasks' ? (taskItems.length ? (<TaskList taskItems={taskItems} dataMode={dataMode}/>) : (<EmptyState title="아직 작업이 없습니다" description="아래 입력창에서 밈 영상을 첨부하고 실행하세요"/>)) : (<EmptyState title="준비 중인 화면입니다."/>)}
        </section>
      </main>
    </>);
}
