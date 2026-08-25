/**
 * Save / Publish popup selectors and field definitions
 * CSS module hashes may change — prefer IDs and data-click-area attributes
 */
export const PUBLISH_SELECTORS = {
  // Header buttons
  saveBtn: '[data-click-area="tpb.save"], button[class*="save_btn"]:not([class*="count"]):not([class*="area"])',
  saveCountBtn: '[data-click-area="tpb*s.count"], button[class*="save_count_btn"]',
  publishBtn: '[data-click-area="tpb.publish"], button[class*="publish_btn"]:not([class*="area"])',
  reserveBtn: '[data-click-area="tpb.reserve"], button[class*="reserve_btn"]',

  // Publish popup container (must have is_show — layer_publish exists in DOM when closed)
  popup: '[class*="layer_popup"][class*="is_show"]',
  popupConfirm: '[data-click-area="tpb*i.publish"], button[class*="confirm_btn"]',
  popupClose: '[class*="layer_popup"] [class*="close"], [class*="layer_popup"] button[class*="cancel"]',
  settingsFold: '[data-click-area="tpb*i.down"], button[class*="publish_fold_btn"]',

  // Category & topic
  categoryBtn: '[data-click-area="tpb*i.category"], button[class*="selectbox_button"]',
  categoryItem: '[class*="item__"]',
  topicArea: '[class*="option_theme"], [class*="set_theme"]',

  // Fields (stable IDs)
  tagInput: '#tag-input',
  openPublic: '#open_public',
  openNeighbor: '#open_neighbor',
  openBothNeighbor: '#open_both_neighbor',
  openPrivate: '#open_private',
  timeNow: '#radio_time1',
  timeSchedule: '#radio_time2',
  optionComment: '#publish-option-comment',
  optionSympathy: '#publish-option-sympathy',
  optionSearch: '#publish-option-search',
  optionScrap: '#publish-option-scrap',
  optionOutside: '#publish-option-outside',
  optionSetDefault: '#set-default',
  optionNotice: '#set-notice',
};

export const OPEN_TYPE = {
  public: { id: 'open_public', value: '2', label: '전체공개' },
  neighbor: { id: 'open_neighbor', value: '1', label: '이웃공개' },
  both_neighbor: { id: 'open_both_neighbor', value: '3', label: '서로이웃공개' },
  private: { id: 'open_private', value: '0', label: '비공개' },
};

export const PUBLISH_TIME = {
  now: { id: 'radio_time1', value: 'now', label: '현재' },
  schedule: { id: 'radio_time2', value: 'pre', label: '예약' },
};

export const PUBLISH_OPTIONS = {
  comment: { id: 'publish-option-comment', label: '댓글허용' },
  sympathy: { id: 'publish-option-sympathy', label: '공감허용' },
  search: { id: 'publish-option-search', label: '검색허용' },
  scrap: { id: 'publish-option-scrap', label: '링크허용' },
  outside: { id: 'publish-option-outside', label: '외부공유허용' },
  setDefault: { id: 'set-default', label: '기본값으로 유지' },
  notice: { id: 'set-notice', label: '공지사항' },
};
