import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import Header from '../components/layout/Header';
import Tabs from '../components/layout/Tabs';
import TaskInput from '../components/input/TaskInput';
import TaskList from '../components/task/TaskList';
import EmptyState from '../components/task/EmptyState';
import { useTasksFromAPI } from '../hooks/useTasks';
import { useTasksFromMock } from '../hooks/useTasksMock';
import { useAttachments } from '../hooks/useAttachments';
import { useTagChips } from '../hooks/useTagChips';
import { parseChipsToText } from '../utils/parseChipsToText';
import type { AttachedFile } from '../types/attachment';
import type { DashboardTabKey } from '../constants/phases';
import type { TaskStatus } from '../types/task';
import DebugToolbar from '../debug/DebugToolbar';

interface DashboardPageProps {
  dataMode: 'production' | 'debug';
}

export default function DashboardPage({ dataMode }: DashboardPageProps) {
  const [selectedTab, setSelectedTab] = useState<DashboardTabKey>('tasks');
  const [editorPlainText, setEditorPlainText] = useState<string>('');
  const editorElementRef = useRef<HTMLDivElement>(null);
  const productionTaskDataSource = useTasksFromAPI();
  const debugTaskDataSource = useTasksFromMock();
  const taskDataSource = dataMode === 'debug' ? debugTaskDataSource : productionTaskDataSource;
  const { taskItems, taskCount, prependTask } = taskDataSource;
  const { attachmentItems, addFiles, removeAttachmentById, fallbackIcon } = useAttachments();
  const { autocompleteState, candidates, refreshAutocomplete, closeAutocomplete, moveSelection, insertChip } = useTagChips(attachmentItems);

  const isSendEnabled = editorPlainText.length > 0 || attachmentItems.length > 0;

  const syncEditorText = () => {
    setEditorPlainText(parseChipsToText(editorElementRef.current));
  };

  const handleSelectCandidate = (attachmentItem: AttachedFile) => {
    insertChip(editorElementRef.current, attachmentItem);
    syncEditorText();
  };

  const handleSend = () => {
    if (!isSendEnabled) {
      return;
    }

    const sendText = parseChipsToText(editorElementRef.current);
    prependTask(sendText || '새로운 크리에이티브 요청');
    if (editorElementRef.current) {
      editorElementRef.current.innerHTML = '';
      editorElementRef.current.focus();
    }
    closeAutocomplete();
    setEditorPlainText('');
  };

  const handleEditorInput = () => {
    refreshAutocomplete(editorElementRef.current);
    syncEditorText();
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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

  const handleAddDebugTask = (status: TaskStatus) => {
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

  return (
    <>
      <Header />
      <main>
        <h1 className="hero-title">어떤 밈을 크리에이티브로 만들까요?</h1>
        {dataMode === 'debug' ? <DebugToolbar onAddTask={handleAddDebugTask} onResetTasks={handleResetDebugTasks} /> : null}
        <TaskInput
          attachmentItems={attachmentItems}
          fallbackImageIcon={fallbackIcon.image}
          isSendEnabled={isSendEnabled}
          autocompleteOpen={autocompleteState.isOpen}
          selectedAutocompleteIndex={autocompleteState.selectedIndex}
          autocompleteCandidates={candidates}
          onAttachFiles={addFiles}
          onRemoveAttachment={removeAttachmentById}
          onSend={handleSend}
          onEditorInput={handleEditorInput}
          onEditorKeyDown={handleEditorKeyDown}
          onSelectAutocompleteCandidate={handleSelectCandidate}
          editorRef={editorElementRef}
        />

        <Tabs selectedTab={selectedTab} taskCount={taskCount} onChangeTab={setSelectedTab} />

        <section className="tab-panel">
          {selectedTab === 'tasks' ? (
            taskItems.length ? (
              <TaskList taskItems={taskItems} />
            ) : (
              <EmptyState title="아직 작업이 없습니다" description="아래 입력창에서 밈 영상을 첨부하고 실행하세요" />
            )
          ) : (
            <EmptyState title="준비 중인 화면입니다." />
          )}
        </section>
      </main>
    </>
  );
}
